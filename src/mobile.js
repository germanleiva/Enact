import Vue from 'vue'
import io from 'socket.io-client';
import CSSJSON from 'cssjson'

// import App from './App.vue'

require('./mobile.css')

import {globalStore, ShapeModel, MeasureModel, RuleModel, MeasureInput, TouchInput, ShapeOutputRule} from './store.js'

var socket = io.connect(window.location.href.split('/')[2]);

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
                'backgroundColor': (this.isRecording ? 'red' : 'white'),
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
    template: `<div :id="this.shapeModel.id" v-show="!isCanvasRecording" v-bind:style="styleObject"></div>`,
    props: ['shapeModel'],
    data: function() {
        return {
            // id: null,
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
        isCanvasRecording: function() {
            return mobileCanvasVM.isRecording
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

    }
})

function deleteShapeVM(id) {
    let shapeVMToDelete = mobileCanvasVM.interactiveShapes[id]
    document.getElementById('mobileCanvas').removeChild(shapeVMToDelete.$el)
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
    document.getElementById("mobileCanvas").appendChild(newShapeVM.$el);

    mobileCanvasVM.interactiveShapes[id] = newShapeVM
    return newShapeVM
}

socket.on('message-from-server', function(data) {
    console.log("Received something from server: " + JSON.stringify(data));
    switch(data.type) {
        case "CLEAN":
            let allKeys = []
            for (let eachShapeKey in mobileCanvasVM.interactiveShapes) {
                allKeys.push(eachShapeKey)
            }
            for (let shapeId of allKeys) {
                deleteShapeVM(shapeId)
            }
            break;
        case "START_RECORDING":
            mobileCanvasVM.isRecording = true;
            break;
        case "STOP_RECORDING":
            mobileCanvasVM.isRecording = false;
            break;
        case "NEW_MEASURE":
            let newMeasure = new MeasureModel(mobileCanvasVM,data.message.from, data.message.to, undefined);
            mobileCanvasVM.measures.push(newMeasure);
            break;
        case "NEW_SHAPE":
            // var parentDOM = document.getElementById("mobileCanvas")
            // parentDOM.innerHTML = data.message;
            createShapeVM(data.message.id, data.message)
            break;
        case "EDIT_SHAPE":
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
        case "DELETE_SHAPE":
            // console.log(data.message);
            // var parentDOM = document.getElementById("mobileCanvas")
            // parentDOM.innerHTML = data.message;
            deleteShapeVM(data.message.id)
            break;
        case "NEW_RULE":
            let newRule = new RuleModel(data.message.id)
            // Vue.set(object, key, value)
            Vue.set(mobileCanvasVM.rules,data.message.id,newRule)

            break;
        case "EDIT_RULE":
        // data.message = {"id":1,"input":{"type":"touch","id":0,"property":"translation","axiss":["x","y"],"min":{"x":5e-324,"y":5e-324},"max":{"x":1.7976931348623157e+308,"y":1.7976931348623157e+308}},"output":{"type":"shape","axiss":[],"min":{"x":5e-324,"y":5e-324},"max":{"x":1.7976931348623157e+308,"y":1.7976931348623157e+308}
            let receivedRule = data.message;
            let editedRule = mobileCanvasVM.rules[receivedRule.id]
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
        case "NEW_ANIMATION":
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

            var shapesElements = Array.from(document.getElementById('mobileCanvas').getElementsByTagName("div"));

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
            default:
                console.log("Unrecognized message type from the server " + data.type)
    }
});


var eventsCache = [];

function saveEvent(anEvent) {
    let touches = []
    //We cannot use for .. of .. because iOS doesn't return an array in anEvent.touches
    for (let i=0; i < anEvent.touches.length;i++) {
        let eachTouch = anEvent.touches[i];
        let myTouchObject = { x: eachTouch.pageX, y: eachTouch.pageY }
        touches.push(myTouchObject)
        if (touches.indexOf(myTouchObject) != i) {
            console.log("WRONG. The key "+ eachTouchKey + " should we == to the index in the array " + touches.indexOf(myTouchObject) + ", right?")
        }
    }

    var anEvent = { type: anEvent.type, touches: touches, timeStamp: anEvent.timeStamp }
    socket.emit('message-from-device', { message: anEvent });

    eventsCache.push(anEvent);

    // console.log("Sent: "+JSON.stringify(anEvent))
}

//To prevent scrolling - not working
// document.body.addEventListener('pointermove', function(event) {
//   event.preventDefault();
// }, false);

// document.body.addEventListener('touchstart', function(e) { e.preventDefault(); });
// document.body.addEventListener('touchmove', function(e) { e.preventDefault(); });
// document.body.addEventListener('touchend', function(e) { e.preventDefault(); });

let previousTouchPosition

document.getElementById('mobileCanvas').addEventListener("touchstart", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        saveEvent(event);
    } else {
        // console.log("We are interacting")
        for (let aRuleKey in mobileCanvasVM.rules) {
            //Does the event has a rule that control that touch?
            let aRule = mobileCanvasVM.rules[aRuleKey];
            if (aRule.activate(event, mobileCanvasVM.interactiveShapes)) {
                mobileCanvasVM.activeRules.push(aRule)
            }
        }

        // let touch = event.touches[0]
        // previousTouchPosition = { x: touch.pageX, y: touch.pageY }
    }
});

document.getElementById('mobileCanvas').addEventListener("touchmove", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        saveEvent(event);
    } else {
        for (let anActiveRule of mobileCanvasVM.activeRules) {
            anActiveRule.applyNewInput(event, mobileCanvasVM.interactiveShapes);
            socket.emit('message-from-device', { type: "ACTIVE_RULE", id: anActiveRule.id });
        }

        // let touch = event.touches[0]

        // let deltaX = touch.pageX - previousTouchPosition.x
        // let deltaY = touch.pageY - previousTouchPosition.y
        // console.log("new delta " + deltaX + " " + deltaY)
        // interactiveShapes[0].left = interactiveShapes[0].left + deltaX
        // interactiveShapes[0].top = interactiveShapes[0].top + deltaY

        // console.log("New shape position: " + interactiveShapes[0].left + " " + interactiveShapes[0].top)
        // previousTouchPosition.x = touch.pageX
        // previousTouchPosition.y = touch.pageY
    }
});

document.getElementById('mobileCanvas').addEventListener("touchend", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        saveEvent(event);
    } else {
        //We are interacting
        for (let eachActiveRule of mobileCanvasVM.activeRules) {
            socket.emit('message-from-device', { type: "DEACTIVE_RULE", id: eachActiveRule.id });
        }
        mobileCanvasVM.activeRules = []
    }
});

// document.body.addEventListener('mousedown', function(e) { e.preventDefault(); });
// document.body.addEventListener('mousemove', function(e) { e.preventDefault(); });
// document.body.addEventListener('mouseup', function(e) { e.preventDefault(); });

document.getElementById('mobileCanvas').addEventListener("mousedown", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        saveEvent(event);
    }
});

document.getElementById('mobileCanvas').addEventListener("mousemove", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        saveEvent(event);
    }
});

document.getElementById('mobileCanvas').addEventListener("mouseup", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        saveEvent(event);
    }
});

function playEvents() {
    if (eventsCache.length == 0) {
        alert("No gesture recorded");
        return;
    }

    moveDraggableToInitialPosition();

    var isLast = false;

    var initialTimeStamp = eventsCache[0].timeStamp;

    for (var i = 0; i < eventsCache.length; i++) {
        var cachedEventObject = eventsCache[i];

        if (i === eventsCache.length - 1) {
            isLast = true
        }

        var waitingTime = cachedEventObject.timeStamp - initialTimeStamp;

        // console.log("Event type: " + cachedEventObject.type + " Waiting time: " + waitingTime);
        // console.log("Location: " + cachedEventObject.pageX + " " + event.pageY);

        dispathWaiting(cachedEventObject, waitingTime, isLast);
    }
}

function dispathWaiting(aCachedEventObject, waitingTime, isLast) {
    setTimeout(function() {
        var newEvent = new MouseEvent(aCachedEventObject.type, { clientX: aCachedEventObject.pageX, clientY: aCachedEventObject.pageY });

        // cachedEventObject.timeStamp = new Date().getTime();
        // var result = document.dispatchEvent(aCachedEventObject);
        var result = document.dispatchEvent(newEvent);
        // console.log("Event result: " + result);

        if (isLast) {
            isPlayback = false;
        }

    }, waitingTime);
}
