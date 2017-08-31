import Vue from 'vue'
import io from 'socket.io-client';
import CSSJSON from 'cssjson'

// import App from './App.vue'

require('./mobile.css')
import {globalStore, globalBus, ShapeModel, RectangleModel, PolygonModel, MeasureModel, InputEvent, StateMachine, SMFunction} from './store.js'

let mobileCanvasVM = new Vue({
    el: '#mobileCanvas',
    data: {
        isRecording: false,
        interactiveShapes: {},
        measures: [],
        currentInputEvent: undefined,
        hardcodedValues: {}
    },
    computed: {
        styleObject() {
            return {
                width: globalStore.mobileWidth +'px',
                height: globalStore.mobileHeight + 'px'
            }
        },
        allObjects: {
            cache: false,
            get: function() {
                let shapes = []
                for (let eachShapeVM of Object.values(this.interactiveShapes)) {
                    shapes.push(eachShapeVM.shapeModel)
                }
                let result = shapes.concat(this.measures)

                if (this.currentInputEvent) {
                    result = result.concat(this.currentInputEvent.touches)
                }

                return result
            }
        }
    },
    methods: {
        shapeFor(shapeId) {
            return this.interactiveShapes[shapeId].shapeModel
        },
        distanceFor(distanceId) {
            return this.measures.find(aMeasure => aMeasure.id == distanceId)
        },
        touchFor(touchId) {
            //hack
            return this.currentInputEvent.touchFor(touchId)
        },
        createShapeVM(id, message) {
            let existingShape = this.interactiveShapes[id];
            if (existingShape) {
                return existingShape
            }

            let newShapeModel = ShapeModel.createShape(message.type,id)
            newShapeModel.fromJSON(message)

            let newShapeVM

            if (message.type == 'rectangle') {
                newShapeVM = new RectangleVM({propsData: {shapeModel: newShapeModel }});
            }
            if (message.type == 'polygon') {
                newShapeVM = new PolygonVM({propsData: {shapeModel: newShapeModel }});
            }

            newShapeVM.$mount();
            document.getElementById("shapeContainer").appendChild(newShapeVM.$el);

            this.interactiveShapes[id] = newShapeVM
            return newShapeVM
        },
        deleteShapeVM(id) {
            let shapeVMToDelete = this.interactiveShapes[id]
            if (!shapeVMToDelete) {
                console.log("Trying to delete a shape that we don't have ... id = " + id)
                return
            }
            document.getElementById("shapeContainer").removeChild(shapeVMToDelete.$el)
            shapeVMToDelete.$destroy()
            delete this.interactiveShapes[id]
            return shapeVMToDelete.shapeModel
        }
    },
    mounted: function() {

    }
})

globalStore.mobileCanvasVM = mobileCanvasVM

// var stateMachineHandler = {
//   ownKeys(target) {
//     return ['peras','bananas']
//   },
//   get (target, key) {
//     console.log("stateMachineHandler >> get " + key)
//     if (key in target) {
//         return target[key]
//     }

//     let foundShape = mobileCanvasVM.interactiveShapes[key]
//     if (foundShape) {
//         return foundShape.shapeModel
//     }

//     let foundFunction = target.functions.find(f => f.name == key)
//     if (foundFunction) {
//         return foundFunction.func
//     }

//     if (target.event) {
//         for (var i = 0; i < target.event.touches.length; i++) {
//             let aTouch = target.event.touches[i];
//             if (aTouch.id == key) {
//                 return aTouch
//             }
//         }
//     }

//     return target[key] //Just to send the typical error
//   }
// }

// var proxyStateMachine = new Proxy(new StateMachine({isServer:false}), stateMachineHandler)

let stateMachine = new StateMachine({isServer:false})//proxyStateMachine
window.stateMachine = stateMachine //For debugging in the developer tools
window.mobileCanvasVM = mobileCanvasVM //For debugging in the developer tools
window.globalStore = globalStore //For debugging in the developer tools

$ = stateMachine.globalScope

globalStore.socket.emit('message-from-device', { type:"MOBILE_INIT" });

let RectangleVM = Vue.extend({
    template: `<div :id="id" class="shape" v-bind:style="styleObject"></div>`,
    props: ['shapeModel'],
    data: function() {
        return {
            id: this.shapeModel.id,
            name: this.shapeModel.name
            // color: 'white',
            // left: 0,
            // top: 0,
            // width: 0,
            // height: 0,
            // opacity: 1
        }
    },
    computed: {
        centerX: {
            get: function() {
                return this.left + this.width / 2
            },
            set: function(newCenterX) {
                this.left = newCenterX - this.width / 2
            }
        },
        centerY: {
            get: function() {
                return this.top + this.height / 2
            },
            set: function(newCenterY) {
                this.top = newCenterY - this.height / 2
            }
        },
        styleObject: {
            // cache: false,
            get: function() {
                return {
                    'backgroundColor': this.shapeModel.color,
                    'borderRadius': this.shapeModel.cornerRadius,
                    // 'translation': 'absolute',
                    'left': this.shapeModel.position.x + 'px',
                    'top': this.shapeModel.position.y + 'px',
                    'width': this.shapeModel.size.width.valueOf() + 'px', //Emergency fix
                    'height': this.shapeModel.size.height.valueOf() + 'px', //Emergency fix
                    'border': '1px solid #cccccc',
                    'overflow': 'visible',
                    'opacity': this.shapeModel.isHidden?0:this.shapeModel.opacity,
                    'position': 'absolute'
                }
            }
        }
    },
    created: function() {
        console.log("Rectangle created");
        globalStore.socket.emit('message-from-device', { type:"SHAPE_CREATED", shapeType: this.shapeModel.type, shapeJSON: this.shapeModel.toJSON() });
    },
    watch: {
        shapeModel: {
            deep: true,
            handler: function(newValue,oldValue) {
                globalStore.socket.emit('message-from-device', { type:"SHAPE_CHANGED", shapeJSON: newValue.toJSON() });
            }
        }
    },
    destroyed: function() {
        globalStore.socket.emit('message-from-device', { type:"SHAPE_DELETED", id: this.shapeModel.id });
    }
})

let PolygonVM = Vue.extend({
    template: `<svg :style="svgStyle" width="1" height="1">
    <path ref="svgPolygonPath" :id="shapeModel.id" v-bind:style="styleObject" :d="pathData" :transform="pathTransform"/>
    </svg>`,
    props: ['shapeModel'],
    data: function() {
        return {
            id: this.shapeModel.id,
            name: this.shapeModel.name
        }
    },
    computed: {
        pathData: function() {
            let dataString = ""
            if (this.shapeModel.amountOfVertices > 0) {
                dataString += `M${this.shapeModel.vertexFor('V0').relativeX} ${this.shapeModel.vertexFor('V0').relativeY} `
                for (let i = 1; i < this.shapeModel.amountOfVertices; i++) {
                    let otherVertex = this.shapeModel.vertexFor('V'+i)
                    dataString += `L ${otherVertex.relativeX} ${otherVertex.relativeY} `
                }
                dataString += "Z"
            }
            return dataString
        },
        pathTransform: function() {
            return 'translate('+this.shapeModel.position.x+','+this.shapeModel.position.y+')'
        },
        svgStyle: function() {
            return {
                'position' : 'absolute',
                'left': '0px',
                'top': '0px',
                'overflow': 'visible'
            }
        },
        styleObject: function() {
            return {
                'fill': this.shapeModel.color,
                'stroke': 'gray',
                'stroke-width' : "1",
                'stroke-dasharray' : "none",
                'fill-opacity': '1',
                // 'pointer-events': this.isTestShape?'none':'auto'
            }
        }
    },
    created: function() {
        globalStore.socket.emit('message-from-device', { type:"SHAPE_CREATED", shapeType: this.shapeModel.type, shapeJSON: this.shapeModel.toJSON() });
    },
    watch: {
        shapeModel: {
            deep: true,
            handler: function(newValue,oldValue) {
                globalStore.socket.emit('message-from-device', { type:"SHAPE_CHANGED", shapeJSON: newValue.toJSON() });
            }
        }
    },
    destroyed: function() {
        globalStore.socket.emit('message-from-device', { type:"SHAPE_DELETED", id: this.shapeModel.id });
    }
})

globalStore.socket.on('message-from-server', function(data) {
    // console.log("Received something from server: " + JSON.stringify(data));
    switch(data.type) {
        case "CLEAN_SHAPES_AND_MEASURES": {
            for (let shapeId of Object.keys(mobileCanvasVM.interactiveShapes)) {
                mobileCanvasVM.deleteShapeVM(shapeId)
            }

            for (let aMeasure of Array.from(mobileCanvasVM.measures)) {
                aMeasure.deleteYourself()
            }
            break;
        }
        case "CLEAN":{
            console.log("Cleaning up ... aka deleting everything")

            for (let shapeId of Object.keys(mobileCanvasVM.interactiveShapes)) {
                mobileCanvasVM.deleteShapeVM(shapeId)
            }

            for (let aMeasure of Array.from(mobileCanvasVM.measures)) {
                aMeasure.deleteYourself()
            }

            if (mobileCanvas.currentInputEvent) {
                mobileCanvas.currentInputEvent.deleteYourself()
                mobileCanvas.currentInputEvent = undefined;
            }

            mobileCanvas.hardcodedValues = {}

            // stateMachine.deleteYourself()

            break;
        }
        case "STATE_MACHINE_RESET": {
            stateMachine.currentState = stateMachine.firstState
            break;
        }
        case "START_RECORDING":{
            mobileCanvasVM.isRecording = true;
            break;
        }
        case "STOP_RECORDING":{
            mobileCanvasVM.isRecording = false;
            break;
        }
        case "NEW_MEASURE":{
            let newMeasure = mobileCanvasVM.measures.find(m => m.idCount == data.message.idCount)
            if (!newMeasure) {
                newMeasure = new MeasureModel(mobileCanvasVM,data.message.from, data.message.to, undefined);
                newMeasure.idCount = data.message.idCount;
                mobileCanvasVM.measures.push(newMeasure);
            } else {
                //We need to update the measure right?
                newMeasure.from = data.message.from
                newMeasure.to = data.message.to
            }
            break;
        }
        case "NEW_SHAPE":{
            // console.log("NEW_SHAPE: id: " + data.message.id +  " " + JSON.stringify(data.message));
            // var parentDOM = document.getElementById("mobileCanvas")
            // parentDOM.innerHTML = data.message;
            mobileCanvasVM.createShapeVM(data.message.id, data.message)
            break;
        }
        case "NEW_FUNCTION":{
            let functionDescription = JSON.parse(data.message)
            stateMachine.updateFunction(functionDescription,true);

            break;
        }
        case "EDIT_HARDCODED_VALUE":{
            // console.log(`EDIT_HARDCODED_VALUE: ${data.message}`);
            let {visualStateId,path,value} = JSON.parse(data.message)

            let hardcodedValue = mobileCanvasVM.hardcodedValues[visualStateId]
            if (!hardcodedValue) {
                hardcodedValue = {}
                Vue.set(mobileCanvasVM.hardcodedValues,visualStateId,hardcodedValue)
            }

            let keys = path.split('.')
            let currentObject = hardcodedValue
            for (var i = 0; i < keys.length; i++) {
                let key = keys[i]

                if (i == keys.length - 1) {
                    //Last key in the path, let's insert the value
                    Vue.set(currentObject,key,JSON.parse(value))
                } else {
                    let newObject = currentObject[key]
                    if (!newObject) {
                        newObject = {}
                        Vue.set(currentObject,key,newObject)
                    }
                    currentObject = newObject
                }
            }

            break;
        }
        case "DELETE_HARDCODED_VALUE": {
            console.log(`DELETE_HARDCODED_VALUE: ${data.message}`);

            let {visualStateId,path,value} = JSON.parse(data.message)

            let visitedObjectsToDelete = []

            let hardcodedValue = mobileCanvasVM.hardcodedValues[visualStateId]
            if (!hardcodedValue) {
                console.log("Deleting a value that I don't have ...")
                return
            }

            let keys = path.split('.')
            let currentObject = hardcodedValue

            if (Object.values(currentObject).length == 1) {
                visitedObjectsToDelete.push({object:mobileCanvasVM.hardcodedValues,key:visualStateId})
            }

            for (var i = 0; i < keys.length; i++) {
                let key = keys[i]

                if (i == keys.length - 1) {
                    //Last key in the path, let's insert the value
                    Vue.delete(currentObject,key)
                } else {
                    let newObject = currentObject[key]
                    if (!newObject) {
                        console.log("Pretty sure this shouldn't happen")
                    }
                    if (Object.values(newObject).length == 1) {
                        visitedObjectsToDelete.push({object:currentObject,key:key})
                    }
                    currentObject = newObject
                }
            }

            for (let {object,key} of visitedObjectsToDelete.reverse()) {
                Vue.delete(object,key)
            }

            break;
        }
        case "EDIT_FUNCTION":{
            let functionDescription = JSON.parse(data.message)
            stateMachine.updateFunction(functionDescription)

            break;
        }
        case "EDIT_SHAPE":{
            // console.log("EDIT_SHAPE:" + JSON.stringify(data.message));
            // var parentDOM = document.getElementById("mobileCanvas")
            // parentDOM.innerHTML = data.message;
            let editedShapeVM = mobileCanvasVM.interactiveShapes[data.id]
            if (editedShapeVM) {
                editedShapeVM.shapeModel.fromJSON(data.message)
            } else {
                console.log("Are we editing a shape that was not created????? WERID!" + data.message.id)
            }
            break;
        }
        case "DELETE_SHAPE":{
            // console.log(data.message);
            // var parentDOM = document.getElementById("mobileCanvas")
            // parentDOM.innerHTML = data.message;
            mobileCanvasVM.deleteShapeVM(data.message.id)
            break;
        }
        case "NEW_STATE": {
            let jsonStateData;
            eval(`jsonStateData = ${data.message}`);
            stateMachine.insertNewState(jsonStateData);
            break;
        }
        case "NEW_TRANSITION": {
            let jsonTransitionData;
            eval(`jsonTransitionData = ${data.message}`);
            stateMachine.insertNewTransition(jsonTransitionData)
            break;
        }
        case "MACHINE_DELETED": {
            stateMachine.deleteYourself()
            break;
        }
        case "MACHINE_DELETED_FUNCTION": {
            let functionToDelete = stateMachine.findFunctionId(data.id)
            if (functionToDelete) {
                functionToDelete.deleteYourself()
            }
            break;
        }
        case "MACHINE_DELETED_STATE": {
            let stateToDelete = stateMachine.findStateId(data.id)
            if (stateToDelete) {
                stateToDelete.deleteYourself()
            }
            break;
        }
        case "MACHINE_CHANGED_STATE": {
            try {
                let changedStateData;

                eval("changedStateData = "+data.message);

                let state = stateMachine.findStateId(changedStateData.id)
                if (state) {
                   state.fromJSON(changedStateData)
                } else {
                    //The updates notification are in the setters of the State so we receive them from the constructor of the State
                    console.log("A state that I don't have changed. Shouldn't be a big problem...")
                }
            } catch (e) {
                if (e instanceof SyntaxError) {
                    console.log("SyntaxError in MACHINE_CHANGED_STATE" + e)
                } else {
                    console.log("Unknown error in MACHINE_CHANGED_STATE: " + e)
                }
                console.log(data.message)
            }
            break;
        }
        case "MACHINE_DELETED_TRANSITION": {
            let transitionToDelete = stateMachine.findTransitionId(data.id)
            if (transitionToDelete) {
                transitionToDelete.deleteYourself()
            }
            break;
        }
        case "MACHINE_CHANGED_TRANSITION": {
            try {
                let changedTransitionData;

                eval("changedTransitionData = "+data.message);

                let transition = stateMachine.findTransitionId(changedTransitionData.id)
                transition.fromJSON(changedTransitionData)
            } catch (e) {
                if (e instanceof SyntaxError) {
                    console.log("SyntaxError in MACHINE_CHANGED_TRANSITION" + e)
                } else {
                    console.log("Unknown error in MACHINE_CHANGED_TRANSITION: " + e)
                }
                console.log(data.message)
            }
            break;
        }
        case "TEST_EVENTS": {
            function testEvents(eventsCache,relevantEventIndexes) {
                if (eventsCache.length == 0) {
                    alert("No gesture recorded");
                    return;
                }

                // var isLast = false;

                var initialTimeStamp = eventsCache[0].timeStamp;

                let savedShapesStatesPerEvent = {}

                for (var i = 0; i < eventsCache.length; i++) {
                    var cachedEventObject = eventsCache[i];

                    // if (i === eventsCache.length - 1) {
                    //     isLast = true
                    // }

                    var waitingTime = cachedEventObject.timeStamp - initialTimeStamp;

                    // console.log("Event type: " + cachedEventObject.type + " Waiting time: " + waitingTime);
                    // console.log("Location: " + cachedEventObject.pageX + " " + event.pageY);

                    let currentEventIndex = i

                    dispathWaiting(cachedEventObject, waitingTime, function() {
                        // if (relevantEventIndexes.indexOf(currentEventIndex) >= 0) {
                            let shapeStates = {}
                            for (let eachShapeKey in mobileCanvasVM.interactiveShapes) {
                                let aShape = mobileCanvasVM.shapeFor(eachShapeKey)
                                if (aShape.isHidden == false) {
                                    shapeStates[eachShapeKey] = aShape.toJSON()
                                }
                            }
                            savedShapesStatesPerEvent[currentEventIndex] = shapeStates
                        // }
                        if (currentEventIndex == eventsCache.length - 1) {
                            // send result to the desktop because this is the last event
                            console.log("Sending result to the desktop")
                            globalStore.socket.emit('message-from-device', { type:"TEST_RESULT", message: savedShapesStatesPerEvent });
                        }
                    });

                }
            }

            function dispathWaiting(aCachedEventObject, waitingTime, completionCallback = undefined) {
                setTimeout(function() {
                    // var newEvent = new TouchEvent(aCachedEventObject.type, { pageX: aCachedEventObject.pageX, pageY: aCachedEventObject.pageY });

                    function populateList(newTouchList,touches) {
                        for (let i=0;i< touches.length;i++) {
                            let aTouchObject = touches[i];
                            let createdTouch

                            var isChrome = navigator.userAgent.indexOf("Chrome") > -1

                            if (!isChrome && document.createTouch) {
                                //Safari hack
                                // createdTouch = document.createTouch(view, target, identifier, pageX, pageY, screenX, screenY, clientX, clientY, radiusX, radiusY, rotationAngle, force) {
                                createdTouch = document.createTouch(window, document.getElementById('mobileCanvas'), aTouchObject.identifier, aTouchObject.x, aTouchObject.y, aTouchObject.x, aTouchObject.y, aTouchObject.x, aTouchObject.y, aTouchObject.radiusX, aTouchObject.radiusY, aTouchObject.rotationAngle, aTouchObject.force);
                            } else {
                                createdTouch = new Touch({
                                    identifier: aTouchObject.identifier,
                                    target: document.getElementById('mobileCanvas'),
                                    clientX: aTouchObject.x,
                                    clientY: aTouchObject.y,
                                    pageX: aTouchObject.x,
                                    pageY: aTouchObject.y,
                                    radiusX: aTouchObject.radiusX,
                                    radiusY: aTouchObject.radiusY,
                                    rotationAngle: aTouchObject.rotationAngle,
                                    force: aTouchObject.force,
                                });
                            }
                            newTouchList.push(createdTouch);
                        }
                    }

                    let touchList = []
                    let changedTouchList = []
                    populateList(touchList,aCachedEventObject.touches);
                    populateList(changedTouchList,aCachedEventObject.changedTouches);

                    let touchEvent
                    if (document.createEvent) {
                        //Safari hack

                        touchEvent = document.createEvent('Event');

                        touchEvent.initEvent(aCachedEventObject.type, true, true);

                        // touchEvent.altKey = mouseEv.altKey;
                        // touchEvent.ctrlKey = mouseEv.ctrlKey;
                        // touchEvent.metaKey = mouseEv.metaKey;
                        // touchEvent.shiftKey = mouseEv.shiftKey;

                        touchEvent.touches = touchList;
                        touchEvent.targetTouches = touchList;
                        touchEvent.changedTouches = changedTouchList;
                    } else {
                        touchEvent = new TouchEvent(aCachedEventObject.type, {
                            cancelable: true,
                            bubbles: true,
                            touches: touchList,
                            targetTouches: [],
                            changedTouches: changedTouchList,
                            // currentTarget: document.getElementById('mobileCanvas'),
                            // shiftKey: false,
                        });
                    }


                    // cachedEventObject.timeStamp = new Date().getTime();
                    // var result = document.dispatchEvent(aCachedEventObject);
                    console.log("We are dispatching ...")
                    console.log(touchEvent)
                    var result = document.getElementById('mobileCanvas').dispatchEvent(touchEvent);
                    // console.log("Event result: " + result);
                    if (completionCallback) {
                        completionCallback()
                    }
                }, waitingTime);
            }
            // console.log("dispathWaiting >> " + JSON.stringify(data.message))
            testEvents(data.message, data.eventIndexes)
            break;
        }
        case "NEW_ANIMATION": {
            var newAnimation = data.message;

            // {
            //     shape0: {
            //         {
            //             0%: {top: ...., left: ...., width: .... , height: ....}
            //             20%: {top: ...., left: ...., width: .... , height: ....}
            //             ....
            //         }
            //     },
            //     shape1: {
            //         {
            //             0%: {top: ...., left: ...., width: .... , height: ....}
            //             20%: {top: ...., left: ...., width: .... , height: ....}
            //             ....
            //         }
            //     }
            //     ....
            // }

            // var indexCSS = document.styleSheets[document.styleSheets.length - 1];
            var sheet = (function() {
                // Create the <style> tag

                var style = document.getElementById('customStyle')
                if (style) {
                    console.log("I already have a stylesheet so we are trying to remove the old keyframe rules")
                        // style.disabled = true
                        // style.parentElement.removeChild(style);
                        // loop through all the rules

                    var rules = Array.from(style.sheet.cssRules)
                    for (var i = 0; i < rules.length; i++) {
                        let keyframeParentRule = rules[i]
                        let keyTexts = []
                        for (var j = 0; j < keyframeParentRule.cssRules.length; j++) {
                            keyTexts.push(keyframeParentRule.cssRules[j].keyText);
                        }
                        for (var eachKeyText of keyTexts) {
                            keyframeParentRule.deleteRule(eachKeyText);
                            // styleSheet.deleteRule(eachKeyText);
                            // styleSheet.removeRule(eachKeyText);
                        }

                        style.sheet.removeRule(keyframeParentRule)
                            // find the -webkit-keyframe rule whose name matches our passed over parameter and return that rule
                            // if (ss[i].cssRules[j].type == window.CSSRule.WEBKIT_KEYFRAMES_RULE && ss[i].cssRules[j].name == rule)
                            //     return ss[i].cssRules[j];
                    }


                } else {

                    style = document.createElement("style");
                    style.setAttribute('id', 'customStyle');
                    // Add a media (and/or media query) here if you'd like!
                    // style.setAttribute("media", "screen")
                    // style.setAttribute("media", "only screen and (max-width : 1024px)")

                    // Add the <style> element to the page
                    document.head.appendChild(style);

                    // WebKit hack :(
                    style.appendChild(document.createTextNode(""));
                }

                return style.sheet;
            })();

            var shapesElements = Array.from(document.getElementById('mobileCanvas').getElementsByClassName("shape"));

            for (var shapeModelId in newAnimation) {
                var eachShapeElement = document.getElementById(shapeModelId)
                if (!eachShapeElement) {
                    console.log("CURRENT ANIMATION FOR MODEL " + shapeModelId + " JSON: " + JSON.stringify(newAnimation[shapeModelId]))

                    let styleObject = CSSJSON.toJSON(newAnimation[shapeModelId]['0%']);

                    console.log("PARSED JSON: " + newAnimation[shapeModelId]['0%'])
                    eachShapeElement = mobileCanvasVM.createShapeVM(shapeModelId, styleObject).$el
                }

                var keyframeAnimationText = '@-webkit-keyframes mymove' + shapeModelId + ' {\n'
                for (var percentageTextKey in newAnimation[shapeModelId]) {
                    var shapeStyleObject = newAnimation[shapeModelId][percentageTextKey]
                    keyframeAnimationText += '' + percentageTextKey + ' {' + shapeStyleObject + '}\n'
                }
                keyframeAnimationText += '}'

                //             sheet.insertRule(`.animatable {
                //     width: 100px;
                //     height: 100px;
                //     background: red;
                //     position: relative;
                //     -webkit-animation: mymove 5s infinite; /* Safari 4.0 - 8.0 */
                //     animation: mymove 5s infinite;
                // }`, 0);

                //             sheet.insertRule(`@keyframes mymove {
                //     0%   {top: 0px;}
                //     25%  {top: 200px;}
                //     75%  {top: 50px}
                //     100% {top: 100px;}
                // }`, 1);
                // console.log(keyframeAnimationText)
                sheet.insertRule(keyframeAnimationText, 0)

                if (eachShapeElement.style.webkitAnimation.length == 0) {
                    eachShapeElement.addEventListener("webkitAnimationEnd", function(e) {
                        eachShapeElement.style.webkitAnimation = "none"
                    }, false);
                }
                //     // eachShapeElement.style.animation = "mymove"+shapeModelId +" 1s infinite";

                //     // animation: name duration timing-function delay iteration-count direction fill-mode play-state;
                //     eachShapeElement.style.webkitAnimation = "none"
                // }
                eachShapeElement.style.webkitAnimation = "mymove" + shapeModelId + " 2s ease-in 0s 1 normal forwards running"; /* Safari 4.0 - 8.0 */
            }
            break;
        }
        default: {
            console.log("Unrecognized message type from the server " + data.type)
        }
    }
});

function sendEvent(anEvent,messageType="INPUT_EVENT") {
    // return;
    function generateArrayFrom(nativeTouches) {
        //We cannot use for .. of .. because iOS doesn't return an array in anEvent.touches
        let touchArray = []
        for (let i=0; i < nativeTouches.length;i++) {
            let eachTouch = nativeTouches[i];
            let radiusX = 20
            if (eachTouch['radiusX']) {
                // console.log("eachTouch.radiusX: " + eachTouch.radiusX)
                if (eachTouch.radiusX > 5) {
                    radiusX = eachTouch.radiusX
                }
            }

            let radiusY = 20
            if (eachTouch['radiusY']) {
                // console.log("eachTouch.radiusY: " + eachTouch.radiusY)
                if (eachTouch.radiusY > 5) {
                    radiusY = eachTouch.radiusY
                }
            }

            let rotationAngle = 0
            if (eachTouch['rotationAngle']) {
                rotationAngle = eachTouch.rotationAngle
            }

            let myTouchObject = {identifier: eachTouch.identifier, x: eachTouch.pageX, y: eachTouch.pageY, radiusX: radiusX, radiusY: radiusY, rotationAngle: rotationAngle, force: eachTouch.force }
            touchArray.push(myTouchObject)
            if (touchArray.indexOf(myTouchObject) != i) {
                console.log("WRONG. The key "+ i + " should we == to the index in the array " + touchArray.indexOf(myTouchObject) + ", right?")
            }
        }
        return touchArray
    }

    // console.log(messageType + " >> " + JSON.stringify({ type:messageType, message: { type: anEvent.type, touches: touches, timeStamp: anEvent.timeStamp }}))
    globalStore.socket.emit('message-from-device', { type:messageType, message: { type: anEvent.type, touches: generateArrayFrom(anEvent.touches), changedTouches:generateArrayFrom(anEvent.changedTouches), timeStamp: anEvent.timeStamp } });
}

//To prevent scrolling - not working
// document.body.addEventListener('pointermove', function(event) {
//   event.preventDefault();
// }, false);

// document.body.addEventListener('touchstart', function(e) { e.preventDefault(); });
// document.body.addEventListener('touchmove', function(e) { e.preventDefault(); });
// document.body.addEventListener('touchend', function(e) { e.preventDefault(); });


document.getElementById('mobileCanvas').addEventListener("touchstart", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        // globalStore.socket.emit('message-from-device', { type:"INPUT_EVENT", message: { type: "touchstart", touches: [{identifier: 0, x: 300, y: 100, radiusX: 20, radiusY: 20, rotationAngle: 0, force: 5 }], timeStamp: Date.now() } });
        // globalStore.socket.emit('message-from-device', { type:"INPUT_EVENT", message: { type: "touchmove", touches: [{identifier: 0, x: 250, y: 200, radiusX: 20, radiusY: 20, rotationAngle: 0, force: 5 }], timeStamp: Date.now() } });
        // globalStore.socket.emit('message-from-device', { type:"INPUT_EVENT", message: { type: "touchmove", touches: [{identifier: 0, x: 200, y: 300, radiusX: 20, radiusY: 20, rotationAngle: 0, force: 5 }], timeStamp: Date.now() } });
        // globalStore.socket.emit('message-from-device', { type:"INPUT_EVENT", message: { type: "touchmove", touches: [{identifier: 0, x: 150, y: 400, radiusX: 20, radiusY: 20, rotationAngle: 0, force: 5 }], timeStamp: Date.now() } });
        // globalStore.socket.emit('message-from-device', { type:"INPUT_EVENT", message: { type: "touchend", touches: [{identifier: 0, x: 100, y: 500, radiusX: 20, radiusY: 20, rotationAngle: 0, force: 5 }], timeStamp: Date.now() } });
        // return;

        sendEvent(event);
    } else {
        // console.log(`==> touchstart EVENT, changedTouches: ${event.changedTouches.length}, touches: ${event.touches.length}`)

        stateMachine.processTouchEvent('touchstart', event, stateMachine.recordTouchStart.bind(stateMachine), null);

        sendEvent(event,"CURRENT_EVENT")
    }
},false,true);

document.getElementById('mobileCanvas').addEventListener("touchmove", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        sendEvent(event);
    } else {
        // console.log(`==> touchmove EVENT, changedTouches: ${event.changedTouches.length}, touches: ${event.touches.length}`)

        stateMachine.processTouchEvent('touchmove', event, stateMachine.recordTouchMove.bind(stateMachine), null);

        sendEvent(event,"CURRENT_EVENT")
    }
},false,true);

document.getElementById('mobileCanvas').addEventListener("touchend", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        sendEvent(event);
    } else {
        // We are interacting
        // console.log(`==> touchend EVENT, changedTouches: ${event.changedTouches.length}, touches: ${event.touches.length}`)

        stateMachine.processTouchEvent('touchend', event, stateMachine.recordTouchEnd.bind(stateMachine), stateMachine.clearTouch.bind(stateMachine));

        sendEvent(event,"CURRENT_EVENT")
    }
},false,true);
