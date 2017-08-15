import Vue from 'vue'
import io from 'socket.io-client';
import CSSJSON from 'cssjson'

// import App from './App.vue'

require('./mobile.css')
import {globalStore, ShapeModel, RectangleModel, PolygonModel, MeasureModel, InputEvent, StateMachine, SMFunction} from './store.js'

let socket = io.connect(window.location.href.split('/')[2]);

let mobileCanvasVM = new Vue({
    el: '#mobileCanvas',
    data: {
        isRecording: false,
        interactiveShapes: {},
        measures: []
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
                let result = []
                for (let eachShapeVM of Object.values(this.interactiveShapes)) {
                    result.push(eachShapeVM.shapeModel)
                }
                result = result.concat(this.currentInputEvent.touches)
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
        }
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

//     let foundFunction = target.functions.find((f) => f.name == key)
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

$ = stateMachine.globalScope

socket.emit('message-from-device', { type:"MOBILE_INIT" });

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
                    'left': this.shapeModel.left + 'px',
                    'top': this.shapeModel.top + 'px',
                    'width': this.shapeModel.width + 'px',
                    'height': this.shapeModel.height + 'px',
                    'border': '1px solid gray',
                    'overflow': 'visible',
                    'opacity': this.shapeModel.opacity,
                    'position': 'absolute'
                }
            }
        }
    },
    created: function() {
        console.log("Rectangle created");
        socket.emit('message-from-device', { type:"SHAPE_CREATED", shapeType: this.shapeModel.type, shapeJSON: this.shapeModel.toJSON() });
    },
    watch: {
        shapeModel: {
            deep: true,
            handler: function(newValue,oldValue) {
                socket.emit('message-from-device', { type:"SHAPE_CHANGED", shapeJSON: newValue.toJSON() });
            }
        }
    },
    destroyed: function() {
        socket.emit('message-from-device', { type:"SHAPE_DELETED", id: this.shapeModel.id });
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
                dataString += `M${this.shapeModel.vertexFor(0).x} ${this.shapeModel.vertexFor(0).y} `
                for (let i = 1; i < this.shapeModel.amountOfVertices; i++) {
                    let otherVertex = this.shapeModel.vertexFor(i)
                    dataString += `L ${otherVertex.x} ${otherVertex.y} `
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
        socket.emit('message-from-device', { type:"SHAPE_CREATED", shapeType: this.shapeModel.type, shapeJSON: this.shapeModel.toJSON() });
    },
    watch: {
        shapeModel: {
            deep: true,
            handler: function(newValue,oldValue) {
                socket.emit('message-from-device', { type:"SHAPE_CHANGED", shapeJSON: newValue.toJSON() });
            }
        }
    },
    destroyed: function() {
        socket.emit('message-from-device', { type:"SHAPE_DELETED", id: this.shapeModel.id });
    }
})

function deleteRectangleVM(id) {
    let RectangleVMToDelete = mobileCanvasVM.interactiveShapes[id]
    document.getElementById("shapeContainer").removeChild(RectangleVMToDelete.$el)
    RectangleVMToDelete.$destroy()
    delete mobileCanvasVM.interactiveShapes[id]
}

function createShapeVM(id, message) {
    let existingShape = mobileCanvasVM.interactiveShapes[id];
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

    mobileCanvasVM.interactiveShapes[id] = newShapeVM
    return newShapeVM

}

socket.on('message-from-server', function(data) {
    // console.log("Received something from server: " + JSON.stringify(data));
    switch(data.type) {
        case "CLEAN":{
            let allKeys = []
            for (let eachShapeKey in mobileCanvasVM.interactiveShapes) {
                allKeys.push(eachShapeKey)
            }
            for (let shapeId of allKeys) {
                deleteRectangleVM(shapeId)
            }

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
            let newMeasure = new MeasureModel(mobileCanvasVM,data.message.from, data.message.to, undefined);
            mobileCanvasVM.measures.push(newMeasure);
            break;
        }
        case "NEW_SHAPE":{
            // console.log("NEW_SHAPE: id: " + data.message.id +  " " + JSON.stringify(data.message));
            // var parentDOM = document.getElementById("mobileCanvas")
            // parentDOM.innerHTML = data.message;
            createShapeVM(data.message.id, data.message)
            break;
        }
        case "NEW_FUNCTION":{
            let functionDescription = JSON.parse(data.message)
            stateMachine.updateFunction(functionDescription,true);

            break;
        }
        case "EDIT_FUNCTION":{
            let functionDescription = JSON.parse(data.message)
            console.log(functionDescription)
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
            deleteRectangleVM(data.message.id)
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
                                shapeStates[eachShapeKey] = mobileCanvasVM.shapeFor(eachShapeKey).toJSON()
                            }
                            savedShapesStatesPerEvent[currentEventIndex] = shapeStates
                        // }
                        if (currentEventIndex == eventsCache.length - 1) {
                            // send result to the desktop because this is the last event
                            console.log("Sending result to the desktop")
                            socket.emit('message-from-device', { type:"TEST_RESULT", message: savedShapesStatesPerEvent });
                        }
                    });

                }
            }

            function dispathWaiting(aCachedEventObject, waitingTime, completionCallback = undefined) {
                setTimeout(function() {
                    // var newEvent = new TouchEvent(aCachedEventObject.type, { pageX: aCachedEventObject.pageX, pageY: aCachedEventObject.pageY });
                    let touchList = []
                    for (let i=0;i< aCachedEventObject.touches.length;i++) {
                        let aTouchObject = aCachedEventObject.touches[i];
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
                        touchList.push(createdTouch);
                    }

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
                        touchEvent.changedTouches = touchList;
                    } else {
                        touchEvent = new TouchEvent(aCachedEventObject.type, {
                            cancelable: true,
                            bubbles: true,
                            touches: touchList,
                            targetTouches: [],
                            changedTouches: touchList,
                            // currentTarget: document.getElementById('mobileCanvas'),
                            // shiftKey: false,
                        });
                    }


                    // cachedEventObject.timeStamp = new Date().getTime();
                    // var result = document.dispatchEvent(aCachedEventObject);
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
                    eachShapeElement = createShapeVM(shapeModelId, styleObject).$el
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

/***
    Utility functions to keep track of the touches.
    touchInfo[i] is an info record for the i-th finger being put down:
        The first finger is #0, the second #0, etc.
        When lifting fingers, the corresponding entries are cleared.
        When putting down a finger, the first free entry is used.
    The properties of the info record are:
        id: unique identifier (from touch object)
        index: finger number (i.e., index in touchInfo)
        first.x, first.y, first.t: position and time at touchdown
        prev.x, prev.y, prev.t: previous position and time
        cur.x, cur.y, cur.t: current position and time
    The application can add its own properties if needed

    The utility function manage the info records, and add a property 'info'
    to each event, holding the info record.
    **/

    var touchId2Index = {}; // maps a touch identifier to an index in touchInfo
    var touchInfo = [];     // stores touch information
    var numTouches = 0;     // number of non-null entries in touchInfo
    var firstIndex = -1;    // index of first non-null entry in touchInfo

    // Find the first available slot in touchInfo, initialize the info record
    // and add it to the event
    function recordTouchStart(event, touch) {
        // console.log("-- recordTouchStart id "+touch.identifier);
        var index = 0;
        firstIndex = 0;
        numTouches++;
        while (touchInfo[index])
            index++;
        // console.log("-- index="+index);

        touchId2Index[touch.identifier] = index;
        event.info = touchInfo[index] = {
            id: touch.identifier,
            index: index,
            first: {x: touch.pageX, y: touch.pageY, t: event.timeStamp},
            prev: {x: touch.pageX, y: touch.pageY, t: event.timeStamp},
            cur: {x: touch.pageX, y: touch.pageY, t: event.timeStamp},
        };
        // console.log("-- done");
    };

    // Update the info record and add it to the event
    function recordTouchMove(event, touch) {
        // console.log("-- recordTouchMove id "+touch.identifier);
        // console.log("-- index="+touchId2Index[touch.identifier]);
        event.info = touchInfo[touchId2Index[touch.identifier]];
        event.info.prev = event.info.cur;
        event.info.cur = {x: touch.pageX, y: touch.pageY, t: event.timeStamp};
        // console.log("-- done");
    }

    // Add the info record to the event
    function recordTouchEnd(event, touch) {
        event.info = touchInfo[touchId2Index[touch.identifier]];
    }

    // Remove the info record corresponding to a touch that is now gone
    function clearTouch(event, touch) {
        // console.log("-- clearTouch id "+touch.identifier);
        var index = touchId2Index[touch.identifier];
        delete touchInfo[index];
        delete touchId2Index[touch.identifier];

        numTouches--;
        if (numTouches == 0)
            firstIndex = -1;
        else {
            firstIndex = 0;
            while (!touchInfo[firstIndex])
                firstIndex++;
        }
        // console.log("-- done - numTouches = " + numTouches + ", firstindex = " + firstIndex);
    }

    // A touch event contains one or more touches that have changed.
    // For example, when putting down two fingers at the same time, the event may contain two changed touches.
    // This function calls the bookkeeping functions above for each changed touches of a give event
    // and then passes the modified event to the state machine.
    function processEvent(machine, type, event, preFn, postFn) {
        // console.log(">> processEvent " + type + " - " + event.touches.length + " touches, " + event.changedTouches.length + " changed touches");
        event.preventDefault(); // avoid event bubbling
        // process each change
        for (var i = 0; i < event.changedTouches.length; i++) {
            // console.log("  process touch #"+i);
            // event.touch = event.changedTouches.item(i); // add a shortcut to the touch being processed
            let touchBeingProcessed = event.changedTouches[i];
            // console.log("  preFn ");
            if (preFn){
                // preFn(event, event.touch); // adds / modifies event.info
                preFn(event, touchBeingProcessed); // adds / modifies event.info
            }

            machine.processEvent(type, event);

            if (postFn) {
                // postFn(event, event.touch);
                postFn(event, touchBeingProcessed);
            }
        }
    }

function sendEvent(anEvent,messageType="INPUT_EVENT") {
    // return;

    let touches = []
    //We cannot use for .. of .. because iOS doesn't return an array in anEvent.touches
    for (let i=0; i < anEvent.touches.length;i++) {
        let eachTouch = anEvent.touches[i];

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
        touches.push(myTouchObject)
        if (touches.indexOf(myTouchObject) != i) {
            console.log("WRONG. The key "+ eachTouchKey + " should we == to the index in the array " + touches.indexOf(myTouchObject) + ", right?")
        }
    }

    // console.log(messageType + " >> " + JSON.stringify({ type:messageType, message: { type: anEvent.type, touches: touches, timeStamp: anEvent.timeStamp }}))
    socket.emit('message-from-device', { type:messageType, message: { type: anEvent.type, touches: touches, timeStamp: anEvent.timeStamp } });
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
        // socket.emit('message-from-device', { type:"INPUT_EVENT", message: { type: "touchstart", touches: [{identifier: 0, x: 300, y: 100, radiusX: 20, radiusY: 20, rotationAngle: 0, force: 5 }], timeStamp: Date.now() } });
        // socket.emit('message-from-device', { type:"INPUT_EVENT", message: { type: "touchmove", touches: [{identifier: 0, x: 250, y: 200, radiusX: 20, radiusY: 20, rotationAngle: 0, force: 5 }], timeStamp: Date.now() } });
        // socket.emit('message-from-device', { type:"INPUT_EVENT", message: { type: "touchmove", touches: [{identifier: 0, x: 200, y: 300, radiusX: 20, radiusY: 20, rotationAngle: 0, force: 5 }], timeStamp: Date.now() } });
        // socket.emit('message-from-device', { type:"INPUT_EVENT", message: { type: "touchmove", touches: [{identifier: 0, x: 150, y: 400, radiusX: 20, radiusY: 20, rotationAngle: 0, force: 5 }], timeStamp: Date.now() } });
        // socket.emit('message-from-device', { type:"INPUT_EVENT", message: { type: "touchend", touches: [{identifier: 0, x: 100, y: 500, radiusX: 20, radiusY: 20, rotationAngle: 0, force: 5 }], timeStamp: Date.now() } });
        // return;

        sendEvent(event);
    } else {
        console.log(`==> touchstart EVENT, changedTouches: ${event.changedTouches.length}, touches: ${event.touches.length}`)

        //hack
        mobileCanvasVM.currentInputEvent = new InputEvent(event)

        processEvent(stateMachine, 'touchstart', event, recordTouchStart, null);

        sendEvent(event,"CURRENT_EVENT")
    }
},false,true);

document.getElementById('mobileCanvas').addEventListener("touchmove", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        sendEvent(event);
    } else {
        console.log(`==> touchmove EVENT, changedTouches: ${event.changedTouches.length}, touches: ${event.touches.length}`)

        //hack
        mobileCanvasVM.currentInputEvent = new InputEvent(event)

        processEvent(stateMachine, 'touchmove', event, recordTouchMove, null);

        sendEvent(event,"CURRENT_EVENT")
    }
},false,true);

document.getElementById('mobileCanvas').addEventListener("touchend", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        sendEvent(event);
    } else {
        // We are interacting
        console.log(`==> touchend EVENT, changedTouches: ${event.changedTouches.length}, touches: ${event.touches.length}`)

        processEvent(stateMachine, 'touchend', event, recordTouchEnd, clearTouch);

        sendEvent(event,"CURRENT_EVENT")
    }
},false,true);
