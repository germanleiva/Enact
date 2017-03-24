import Vue from 'vue'
import io from 'socket.io-client';
import CSSJSON from 'cssjson'

// import App from './App.vue'

require('./mobile.css')

import {globalStore, ShapeModel, RectangleModel, PolygonModel, MeasureModel, RuleModel, ShapeInput, MeasureInput, TouchInput, ShapeOutputRule, InputEvent} from './store.js'

let socket = io.connect(window.location.href.split('/')[2]);

let isInside = function(touch, shape) {
    return shape.left < touch.pageX && shape.top < touch.pageY && shape.left + shape.width > touch.pageX && shape.top + shape.height > touch.pageY;
}

// let r1_initial_y_position
// let r2_initial_y_position
// let r1_initial_height

// let exampleRule1 = new RuleModel(1,
//     {type:'touch',id:0,property:'translation',axiss:['y']},
//     // new TouchInput(0, 'translation', ['y'], isInside),
//     undefined,
//     {vsId: '0', shapeId:'shape0',property:'bottom'}, //inputMax
//     { id: 'shape0', property: 'translation', axis: ['y'] },
//     undefined,
//     {vsId: '0', shapeId:'shape0',property:'top'}//outputMax
// )

// let exampleRule2 = new RuleModel(2,
//     {type:'touch',id:1,property:'translation',axiss:['y']},
//     // new TouchInput(1, 'translation', ['y'], isInside),,
//     {vsId: '0', shapeId:'shape1',property:'top'}, //inputMin
//     undefined,
//     { id: 'shape1', property: 'translation', axis: ['y'] },
//     {vsId: '0', shapeId:'shape1',property:'top'}, //outputMin
//     undefined
// )
// let exampleRule3 = new RuleModel(3,
//     {type:'distance',fromType:'shape', fromId:'shape0',fromHandler:'southEast',toType:'shape',toId:'shape1',toHandler:'northEast',axiss:['y']},
//     undefined,
//     undefined,
//     { id: 'shape2', property: 'scaling', axis: ['y'] },
//     undefined,
//     {vsId: '0', shapeId:'shape0',property:'height'} //outputMax
// )
// let exampleRule4 = new RuleModel(4,
//     {type:'point', fromType: 'distance', fromId:'distance0',fromHandler:'center',toType:'distance', toId:'distance0',toHandler:'center',axiss:['y']},
//     // new MeasureInput(function(newEvent){
//     //     let r1 = interactiveShapes['shape0'];
//     //     let r2 = interactiveShapes['shape1'];
//     //     let r3 = interactiveShapes['shape2']
//     //     let previousValue = {x: r3.centerX, y: r3.centerY};
//     //     let r1bottom = r1.top + r1.height
//     //     let newValue = {x: r3.centerX, y: r1bottom + (r2.top - r1bottom) / 2}
//     //     // console.log("Calculating measure center r3: " + JSON.stringify(previousValue) + " " + JSON.stringify(newValue))
//     //     return {previousValue,newValue}
//     // },['y']),
//     undefined,
//     undefined,
//     { id: 'shape2', property: 'center', axis: ['y'] }
// )

// let rules = [exampleRule1, exampleRule2, exampleRule3, exampleRule4]

let mobileCanvasVM = new Vue({
    el: '#mobileCanvas',
    data: {
        isRecording: false,
        activeRules: [],
        rules: {},
        interactiveShapes: {},
        measures: []
    },
    computed: {
        styleObject() {
            return {
                width: globalStore.mobileWidth +'px',
                height: globalStore.mobileHeight + 'px'
            }
        }
    },
    methods: {
        shapeFor(shapeId) {
            return this.interactiveShapes[shapeId].shapeModel
        },
        distanceFor(distanceId) {
            return this.measures.find(aMeasure => aMeasure.id == distanceId)
        }
    }
})

let RectangleVM = Vue.extend({
    template: `<div :id="id" class="shape" v-bind:style="styleObject"></div>`,
    props: ['shapeModel'],
    data: function() {
        return {
            id: this.shapeModel.id
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
            id: this.shapeModel.id
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

            mobileCanvasVM.rules = {}
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
        case "NEW_RULE":{
            // console.log("NEW_RULE => " + JSON.stringify(data.message))
            let newRule = new RuleModel(data.message.id)
            // Vue.set(object, key, value)
            Vue.set(mobileCanvasVM.rules,data.message.id,newRule)

            break;
        }
        case "EDIT_RULE":{
            console.log("EDIT_RULE => " + JSON.stringify(data.message))
        // data.message = {"id":1,"input":{"type":"touch","id":0,"property":"translation","axiss":["x","y"],"min":{"x":5e-324,"y":5e-324},"max":{"x":1.7976931348623157e+308,"y":1.7976931348623157e+308}},"output":{"type":"shape","axiss":[],"min":{"x":5e-324,"y":5e-324},"max":{"x":1.7976931348623157e+308,"y":1.7976931348623157e+308}
            let receivedRule = data.message;
            let editedRule = mobileCanvasVM.rules[receivedRule.id]
            editedRule.factor.x = data.message.factor.x
            editedRule.factor.y = data.message.factor.y

            if (editedRule) {
                switch (receivedRule.input.type) {
                    case 'touch':{
                        let isTouchInputInstance = editedRule.input instanceof TouchInput
                        if (editedRule.input == undefined || !isTouchInputInstance) {
                            editedRule.input = new TouchInput(receivedRule.input.id,receivedRule.input.property,receivedRule.input.axiss)
                        }
                        editedRule.input.touchId = receivedRule.input.id.slice(1,receivedRule.input.id.length) //TODO this removes the first character F of the id
                        editedRule.input.property = receivedRule.input.property
                        editedRule.input.axis = receivedRule.input.axiss

                        editedRule.input.minX = receivedRule.input.min.x
                        editedRule.input.minY = receivedRule.input.min.y

                        editedRule.input.maxX = receivedRule.input.max.x
                        editedRule.input.maxY = receivedRule.input.max.y
                        break;
                    }
                    case 'measure':{
                        let isMeasureInputInstance = editedRule.input instanceof MeasureInput
                        if (editedRule.input == undefined || !isMeasureInputInstance) {
                            editedRule.input = new MeasureInput(undefined,receivedRule.input.property,receivedRule.input.axiss)
                        }
                        editedRule.input.measureObject = mobileCanvasVM.measures.find(aMeasure => aMeasure.id == receivedRule.input.id)
                        editedRule.input.property = receivedRule.input.property
                        editedRule.input.axis = receivedRule.input.axiss

                        editedRule.input.minX = receivedRule.input.min.x
                        editedRule.input.minY = receivedRule.input.min.y

                        editedRule.input.maxX = receivedRule.input.max.x
                        editedRule.input.maxY = receivedRule.input.max.y

                        break;
                    }
                    case 'shape':{
                        let isShapeInputInstance = editedRule.input instanceof ShapeInput
                        if (editedRule.input == undefined || !isShapeInputInstance) {
                            editedRule.input = new ShapeInput(undefined,receivedRule.input.property,receivedRule.input.axiss)
                        }
                        editedRule.input.shapeObject = mobileCanvasVM.shapeFor(receivedRule.input.id)
                        editedRule.input.property = receivedRule.input.property
                        editedRule.input.axis = receivedRule.input.axiss

                        editedRule.input.minX = receivedRule.input.min.x
                        editedRule.input.minY = receivedRule.input.min.y

                        editedRule.input.maxX = receivedRule.input.max.x
                        editedRule.input.maxY = receivedRule.input.max.y

                        break;
                    }
                    default:{
                        console.log("EDIT_RULE >> unrecognized input type: " + receivedRule.input.type)
                    }
                }
                for (let i=0; i<receivedRule.outputs.length;i++) {
                    let eachOutputRule = receivedRule.outputs[i];
                    let correspondingOutputRule = editedRule.outputs[i]

                    switch (eachOutputRule.type) {
                        case 'shape':{
                            if (!correspondingOutputRule) {
                                correspondingOutputRule = new ShapeOutputRule(eachOutputRule.id,eachOutputRule.property,eachOutputRule.axiss)
                                editedRule.outputs.push(correspondingOutputRule)
                            }
                            correspondingOutputRule.id = eachOutputRule.id
                            correspondingOutputRule.property = eachOutputRule.property
                            correspondingOutputRule.axis = eachOutputRule.axiss

                            correspondingOutputRule.minX = eachOutputRule.min.x
                            correspondingOutputRule.minY = eachOutputRule.min.y

                            correspondingOutputRule.maxX = eachOutputRule.max.x
                            correspondingOutputRule.maxY = eachOutputRule.max.y
                            break;
                        }
                        default:{
                            console.log("EDIT_RULE >> unrecognized output type: "+eachOutputRule.type)
                        }
                    }
                }
            } else {
                console.log("WERID, editing a rule that we don't have")
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
        // console.log("We are starting interacting")

        //hack
        mobileCanvasVM.currentInputEvent = new InputEvent(event)

        for (let aRuleKey in mobileCanvasVM.rules) {
            //Does the event has a rule that control that touch?
            let aRule = mobileCanvasVM.rules[aRuleKey];
            if (aRule.activate(event, mobileCanvasVM.interactiveShapes)) {
                mobileCanvasVM.activeRules.push(aRule)
            }
        }

        sendEvent(event,"CURRENT_EVENT")
    }
},false,true);

document.getElementById('mobileCanvas').addEventListener("touchmove", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        sendEvent(event);
    } else {
        // console.log("We are interacting")

        //hack
        mobileCanvasVM.currentInputEvent = new InputEvent(event)

        for (let anActiveRule of mobileCanvasVM.activeRules) {
            anActiveRule.applyNewInput(event, mobileCanvasVM.interactiveShapes);
            socket.emit('message-from-device', { type: "ACTIVE_RULE", id: anActiveRule.id});
        }
        sendEvent(event,"CURRENT_EVENT")
    }
},false,true);

document.getElementById('mobileCanvas').addEventListener("touchend", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        sendEvent(event);
    } else {
        // We are interacting
        // console.log("We are ending interacting")
        for (let eachActiveRule of mobileCanvasVM.activeRules) {
            socket.emit('message-from-device', { type: "DEACTIVE_RULE", id: eachActiveRule.id });
        }
        mobileCanvasVM.activeRules = []
        sendEvent(event,"CURRENT_EVENT")
    }
},false,true);

// document.body.addEventListener('mousedown', function(e) { e.preventDefault(); });
// document.body.addEventListener('mousemove', function(e) { e.preventDefault(); });
// document.body.addEventListener('mouseup', function(e) { e.preventDefault(); });

document.getElementById('mobileCanvas').addEventListener("mousedown", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        sendEvent(event);
    }
});

document.getElementById('mobileCanvas').addEventListener("mousemove", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        sendEvent(event);
    }
});

document.getElementById('mobileCanvas').addEventListener("mouseup", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        sendEvent(event);
    }
});
