import Vue from 'vue'
import io from 'socket.io-client';
import CSSJSON from 'cssjson'

// import App from './App.vue'

require('./mobile.css')

// import store from './store.js'

var socket = io.connect(window.location.href.split('/')[2]);

class InEvent {
    constructor(touchId, property, listOfAxis, aShouldApplyFn) {
        this.touchId = touchId
        this.property = property
        this.axis = listOfAxis
        this.initialCondition = function(event, aShape) { return aShouldApplyFn(this.touchFor(event),aShape); }
    }
    shouldActivate(aRule, anEvent) {
        //The event has the corresponding touch
        return anEvent.touches[this.touchId] != undefined
    }
    touchFor(event) {
        return event.touches[this.touchId]
    }
    applyNewInput(aRule, newEvent) {
        let previousTouch = aRule.currentInput.touches[this.touchId]

        let touch = newEvent.touches[this.touchId]

        if (this.axis.length > aRule.output.axis.length) {
            console.log("Fatal error: there are more input axis than output axis on this rule: " + aRule)
            abort()
        }

        let delta = { x: 0, y: 0 }
        if (this.property == 'position') {
            for (let eachInputAxis of this.axis) {
                delta[eachInputAxis] = touch['page' + eachInputAxis.toUpperCase()] - previousTouch['page' + eachInputAxis.toUpperCase()]
            }
        }

        switch (aRule.output.property) {
            case 'position':
                for (let i = 0; i < aRule.output.axis.length; i++) {
                    let eachOutputAxis = aRule.output.axis[i];
                    let correspondingInputAxis = this.axis[i];
                    if (!correspondingInputAxis) {
                        console.log("the rule does not have an input axis defined for that output axis, but we assume that the first will be used")
                        correspondingInputAxis = this.axis[0];
                    }
                    let outputProperty = ''
                    switch (eachOutputAxis) {
                        case 'x':
                            outputProperty = 'left';
                            break
                        case 'y':
                            outputProperty = 'top';
                            break;
                    }
                    let newValue = aRule.currentOutput[outputProperty] + delta[correspondingInputAxis]
                    if (aRule.shouldKeepApplying(aRule.currentOutput[outputProperty], newValue)) {
                        aRule.currentOutput[outputProperty] = newValue
                    }
                }
                break;
            case 'size':
                for (let i = 0; i < aRule.output.axis.length; i++) {
                    let eachOutputAxis = aRule.output.axis[i];
                    let correspondingInputAxis = this.axis[i];
                    if (!correspondingInputAxis) {
                        console.log("the rule does not have an input axis defined for that output axis, but we assume that the first will be used")
                        correspondingInputAxis = this.axis[0];
                    }
                    let outputProperty = ''
                    switch (eachOutputAxis) {
                        case 'x':
                            outputProperty = 'width';
                            break
                        case 'y':
                            outputProperty = 'height';
                            break;
                    }

                    let newValue = aRule.currentOutput[outputProperty] + delta[correspondingInputAxis]
                    if (aRule.shouldKeepApplying(aRule.currentOutput[outputProperty], newValue)) {
                        aRule.currentOutput[outputProperty] = newValue
                    }
                }
                break;
        }

        aRule.currentInput = newEvent
    }
}

class InMeasure {
    get shape1Id() {
        return allShapes[0].id;
    }
    get shape2Id() {
        return allShapes[1].id;
    }
    shouldActivate(aRule, anEvent) {
        //For now, the measure rules should be always active (maybe if the related shaped are not present this should be false)
        return true;
    }
    initialCondition(event,aShape) {
        return true;
    }
    applyNewInput(aRule,newEvent) {
        let r1 = allShapes[this.shape1Id];
        let r2 = allShapes[this.shape2Id];
        let r3 = allShapes[2]
        let previousHeight = r3.height
        let newHeight = Math.abs(r1.top + r1.height - r2.top)

        if (aRule.shouldKeepApplying(previousHeight, newHeight)) {

            r3.height = newHeight
            r3.top -= (newHeight - previousHeight) / 2
        }
    }
}

class Rule {
    constructor(input, output, shouldKeepApplying) {
        this.in = input;
        this.output = output;
        this.shouldKeepApplying = shouldKeepApplying;
        this.enforce = true;
        this.currentInput = undefined;
        this.currentOutput = undefined;
    }
    activate(anEvent, globalShapeDictionary) {
        if (this.in.shouldActivate(this, anEvent)) {
            //Does it affect one of the current shapes?
            let controlledShape = globalShapeDictionary[this.output.id]
            if (controlledShape) {
                if (this.in.initialCondition(event, controlledShape)) {
                    this.currentInput = event
                    this.currentOutput = controlledShape
                    return true
                }
            }
        }
        return false
    }
    applyNewInput(newEvent) {
        // let touch = event.touches[0]
        this.in.applyNewInput(this,newEvent)
    }
}

let isInside = function(touch, shape) {
    return shape.left < touch.pageX && shape.top < touch.pageY && shape.left + shape.width > touch.pageX && shape.top + shape.height > touch.pageY;
}

let exampleRule1 = new Rule(
    new InEvent(0, 'position', ['y'], isInside),
    { id: '0', property: 'position', axis: ['y'] },
    function(oldValue, newValue) {
        return newValue < 200
    }
)
let exampleRule2 = new Rule(
    new InEvent(1, 'position', ['y'], isInside),
    { id: '1', property: 'position', axis: ['y'] },
    function(oldValue, newValue) {
        return newValue > 200
    }
)
let exampleRule3 = new Rule(
    new InMeasure(),
    { id: '2', property: 'size', axis: ['y'] },
    function(oldValue, newValue) {
        return newValue < 100
    }
)
let rules = [exampleRule1, exampleRule2, exampleRule3]
let activeRules = []

let mobileCanvasVM = new Vue({
    el: '#mobileCanvas',
    data: {
        isRecording: false
    },
    computed: {
        styleObject() {
            return { 'backgroundColor': (this.isRecording ? 'red' : 'white'), width: '375px', height: '667px' }
        }
    }
})

let ShapeVM = Vue.extend({
    template: `<div :id="'shape'+id" v-show="!isCanvasRecording" v-bind:style="styleObject"></div>`,
    data: function() {
        return {
            id: null,
            color: 'white',
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            opacity: 1
        }
    },
    computed: {
        isCanvasRecording: function() {
            return mobileCanvasVM.isRecording
        },
        styleObject: {
            cache: false,
            get: function() {
                return {
                    'backgroundColor': this.color,
                    'position': 'absolute',
                    'left': this.left + 'px',
                    'top': this.top + 'px',
                    'width': this.width + 'px',
                    'height': this.height + 'px',
                    'border': '1px solid gray',
                    'overflow': 'visible',
                    'opacity': this.opacity
                }
            }
        }

    }
})

let allShapes = {}

function createShapeVM(id, message) {
    let existingShape = allShapes[id];
    if (existingShape) {
        return existingShape
    }

    var newShapeVM = new ShapeVM();

    newShapeVM.id = id;
    newShapeVM.color = message.color;
    newShapeVM.width = message.width;
    newShapeVM.height = message.height;
    newShapeVM.top = message.top;
    newShapeVM.left = message.left;
    newShapeVM.opacity = message.opacity;

    newShapeVM.$mount();
    document.getElementById("mobileCanvas").appendChild(newShapeVM.$el);

    allShapes[id] = newShapeVM
    return newShapeVM
}

socket.on('message-from-server', function(data) {
    // console.log("Received something from server: " + JSON.stringify(data));

    if (data.type == "START_RECORDING") {
        mobileCanvasVM.isRecording = true;
    }
    if (data.type == "STOP_RECORDING") {
        mobileCanvasVM.isRecording = false;
    }
    if (data.type == "NEW_SHAPE") {
        // var parentDOM = document.getElementById("mobileCanvas")
        // parentDOM.innerHTML = data.message;
        createShapeVM(data.message.id, data.message)
    }
    if (data.type == "EDIT_SHAPE") {
        // console.log(data.message);
        // var parentDOM = document.getElementById("mobileCanvas")
        // parentDOM.innerHTML = data.message;
        let editedShapeVM = allShapes[data.message.id]
        if (editedShapeVM) {
            editedShapeVM.color = data.message.color;
            editedShapeVM.left = data.message.left;
            editedShapeVM.top = data.message.top;
            editedShapeVM.width = data.message.width;
            editedShapeVM.height = data.message.height;
            editedShapeVM.opacity = data.message.opacity;
        } else {
            console.log("Are we editing a shape that was not created????? WERID!")
        }

    }
    if (data.type == "NEW_ANIMATION") {

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




    }
});


var eventsCache = [];

function saveEvent(anEvent) {
    let touches = []
    for (let eachTouch of anEvent.touches) {
        touches.push({ x: eachTouch.pageX, y: eachTouch.pageY })
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

document.body.addEventListener('touchstart', function(e) { e.preventDefault(); });
document.body.addEventListener('touchmove', function(e) { e.preventDefault(); });
document.body.addEventListener('touchend', function(e) { e.preventDefault(); });

let previousTouchPosition

document.addEventListener("touchstart", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        saveEvent(event);
    } else {
        //We are interacting
        for (let aRule of rules) {
            //Does the event has a rule that control that touch?
            if (aRule.activate(event, allShapes)) {
                activeRules.push(aRule)
            }
        }

        // let touch = event.touches[0]
        // previousTouchPosition = { x: touch.pageX, y: touch.pageY }
    }
});

document.addEventListener("touchmove", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        saveEvent(event);
    } else {
        for (let anActiveRule of activeRules) {
            anActiveRule.applyNewInput(event)
        }

        // let touch = event.touches[0]

        // let deltaX = touch.pageX - previousTouchPosition.x
        // let deltaY = touch.pageY - previousTouchPosition.y
        // console.log("new delta " + deltaX + " " + deltaY)
        // allShapes[0].left = allShapes[0].left + deltaX
        // allShapes[0].top = allShapes[0].top + deltaY

        // console.log("New shape position: " + allShapes[0].left + " " + allShapes[0].top)
        // previousTouchPosition.x = touch.pageX
        // previousTouchPosition.y = touch.pageY
    }
});

document.addEventListener("touchend", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        saveEvent(event);
    } else {
        //We are interacting
        activeRules = []
    }
});

document.body.addEventListener('mousedown', function(e) { e.preventDefault(); });
document.body.addEventListener('mousemove', function(e) { e.preventDefault(); });
document.body.addEventListener('mouseup', function(e) { e.preventDefault(); });

document.addEventListener("mousedown", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        saveEvent(event);
    }
});

document.addEventListener("mousemove", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        saveEvent(event);
    }
});

document.addEventListener("mouseup", function(event) {
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
