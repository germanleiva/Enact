import Vue from 'vue'
import io from 'socket.io-client';
import CSSJSON from 'cssjson'

// import App from './App.vue'

require('./mobile.css')

import {globalStore, ShapeModel, MeasureModel, RuleModel, MeasureInput, TouchInput, ShapeOutputRule} from './store.js'

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

let ShapeVM = Vue.extend({
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
            cache: false,
            get: function() {
                return {
                    'backgroundColor': this.shapeModel.color,
                    'translation': 'absolute',
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
        socket.emit('message-from-device', { type:"SHAPE_CREATED", id: this.id, style: this.styleObject });
    },
    watch: {
        "styleObject": {
            deep: false,
            handler: function(newValue,oldValue) {
                let changes = {}
                for (let eachKey in newValue) {
                    if (newValue[eachKey] != oldValue[eachKey]) {
                        changes[eachKey] = newValue[eachKey]
                    }
                }
                socket.emit('message-from-device', { type:"SHAPE_CHANGED", id: this.id, style: changes });
            }
        }
    }
})

function deleteShapeVM(id) {
    let shapeVMToDelete = mobileCanvasVM.interactiveShapes[id]
    document.getElementById("shapeContainer").removeChild(shapeVMToDelete.$el)
    shapeVMToDelete.$destroy()
    delete mobileCanvasVM.interactiveShapes[id]
}

function createShapeVM(id, message) {
    let existingShape = mobileCanvasVM.interactiveShapes[id];
    if (existingShape) {
        return existingShape
    }

    let newShapeModel = new ShapeModel(id,undefined,message.color,message.left,message.top,message.width,message.height)
    newShapeModel.opacity = message.opacity;

    var newShapeVM = new ShapeVM({propsData: {shapeModel: newShapeModel }});

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
                deleteShapeVM(shapeId)
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
            // var parentDOM = document.getElementById("mobileCanvas")
            // parentDOM.innerHTML = data.message;
            createShapeVM(data.message.id, data.message)
            break;
        }
        case "EDIT_SHAPE":{
            // console.log(data.message);
            // var parentDOM = document.getElementById("mobileCanvas")
            // parentDOM.innerHTML = data.message;
            let editedShapeVM = mobileCanvasVM.interactiveShapes[data.id]
            if (editedShapeVM) {
                for (let eachKey in data.message) {
                    editedShapeVM.shapeModel[eachKey] = data.message[eachKey]
                }
            } else {
                console.log("Are we editing a shape that was not created????? WERID!" + data.message.id)
            }
            break;
        }
        case "DELETE_SHAPE":{
            // console.log(data.message);
            // var parentDOM = document.getElementById("mobileCanvas")
            // parentDOM.innerHTML = data.message;
            deleteShapeVM(data.message.id)
            break;
        }
        case "NEW_RULE":{
            let newRule = new RuleModel(data.message.id)
            // Vue.set(object, key, value)
            Vue.set(mobileCanvasVM.rules,data.message.id,newRule)

            break;
        }
        case "EDIT_RULE":{
        // data.message = {"id":1,"input":{"type":"touch","id":0,"property":"translation","axiss":["x","y"],"min":{"x":5e-324,"y":5e-324},"max":{"x":1.7976931348623157e+308,"y":1.7976931348623157e+308}},"output":{"type":"shape","axiss":[],"min":{"x":5e-324,"y":5e-324},"max":{"x":1.7976931348623157e+308,"y":1.7976931348623157e+308}
            let receivedRule = data.message;
            let editedRule = mobileCanvasVM.rules[receivedRule.id]
            editedRule.factor.x = data.message.factor.x
            editedRule.factor.y = data.message.factor.y

            if (editedRule) {
                switch (receivedRule.input.type) {
                    case 'touch':
                        if (editedRule.input == undefined || !editedRule.input instanceof TouchInput) {
                            editedRule.input = new TouchInput(receivedRule.input.id,receivedRule.input.property,receivedRule.input.axiss)
                        }
                        editedRule.input.touchId = receivedRule.input.id
                        editedRule.input.property = receivedRule.input.property
                        editedRule.input.axis = receivedRule.input.axiss

                        let minObtained = receivedRule.input.min
                        if (typeof minObtained === 'string' || minObtained instanceof String) {
                            minObtained = JSON.parse(minObtained)
                        }
                        editedRule.input.minPosition = minObtained

                        let maxObtained = receivedRule.input.max
                        if (typeof maxObtained === 'string' || maxObtained instanceof String) {
                            maxObtained = JSON.parse(maxObtained)
                        }
                        editedRule.input.maxPosition = maxObtained
                        break;
                    case 'measure':
                        if (editedRule.input == undefined || !editedRule.input instanceof MeasureInput) {
                            editedRule.input = new MeasureInput(undefined,receivedRule.input.property,receivedRule.input.axiss)
                        }
                        editedRule.input.measureObject = mobileCanvasVM.measures.find(aMeasure => aMeasure.id == receivedRule.input.id)
                        editedRule.input.property = receivedRule.input.property
                        editedRule.input.axis = receivedRule.input.axiss

                        break;
                    default:
                        console.log("EDIT_RULE >> unrecognized input type: " + receivedRule.input.type)
                }
                if (receivedRule.output.id) {
                    switch (receivedRule.output.type) {
                        case 'shape':
                            if (editedRule.output == undefined || !editedRule.output instanceof ShapeOutputRule) {
                                editedRule.output = new ShapeOutputRule(receivedRule.output.id,receivedRule.output.property,receivedRule.output.axiss)
                            }
                            editedRule.output.id = receivedRule.output.id
                            editedRule.output.property = receivedRule.output.property
                            editedRule.output.axis = receivedRule.output.axiss

                            let minObtained = receivedRule.output.min
                            if (typeof minObtained === 'string' || minObtained instanceof String) {
                                minObtained = JSON.parse(minObtained)
                            }
                            editedRule.output.minValue = minObtained

                            let maxObtained = receivedRule.output.max
                            if (typeof maxObtained === 'string' || maxObtained instanceof String) {
                                maxObtained = JSON.parse(maxObtained)
                            }
                            editedRule.output.maxValue = maxObtained
                            break;
                        default:
                            console.log("EDIT_RULE >> unrecognized output type: "+receivedRule.output.type)
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
                                let eachShapeVM = mobileCanvasVM.interactiveShapes[eachShapeKey]
                                shapeStates[eachShapeKey] = {id: eachShapeKey, left: eachShapeVM.shapeModel.left, top: eachShapeVM.shapeModel.top, width: eachShapeVM.shapeModel.width, height: eachShapeVM.shapeModel.height, color: eachShapeVM.shapeModel.color }
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

                        if (document.createTouch) {
                            //Safari hack
                            // createdTouch = document.createTouch(view, target, identifier, pageX, pageY, screenX, screenY, clientX, clientY) {
                            createdTouch = document.createTouch(window, document.getElementById('mobileCanvas'), aTouchObject.identifier, aTouchObject.x, aTouchObject.y, aTouchObject.x, aTouchObject.y, aTouchObject.x, aTouchObject.y);
                        } else {
                            createdTouch = new Touch({
                                identifier: aTouchObject.identifier,
                                target: document.getElementById('mobileCanvas'),
                                clientX: aTouchObject.x,
                                clientY: aTouchObject.y,
                                pageX: aTouchObject.x,
                                pageY: aTouchObject.y,
                                radiusX: aTouchObject.radiusX,
                                radiusY: aTouchObject.radiusX,
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
        if (eachTouch.hasOwnProperty('radiusX')) {
            if (eachTouch.radiusX > 1) {
                radiusX = eachTouch.radiusX
            }
        }

        let radiusY = 20
        if (eachTouch.hasOwnProperty('radiusY')) {
            if (eachTouch.radiusY > 1) {
                radiusY = eachTouch.radiusY
            }
        }

        let rotationAngle = 0
        if (eachTouch.hasOwnProperty('rotationAngle')) {
            rotationAngle = eachTouch.rotationAngle
        }

        let myTouchObject = {identifier: eachTouch.identifier, x: eachTouch.pageX, y: eachTouch.pageY, radiusX: radiusX, radiusY: radiusY, rotationAngle: rotationAngle, force: eachTouch.force }
        touches.push(myTouchObject)
        if (touches.indexOf(myTouchObject) != i) {
            console.log("WRONG. The key "+ eachTouchKey + " should we == to the index in the array " + touches.indexOf(myTouchObject) + ", right?")
        }
    }

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
        console.log("We are starting interacting")
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
        console.log("We are interacting")

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
        console.log("We are ending interacting")
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
