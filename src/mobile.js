import Vue from 'vue'
import io from 'socket.io-client';
import CSSJSON from 'cssjson'

// import App from './App.vue'

require('./mobile.css')

// import store from './store.js'

var socket = io.connect(window.location.href.split('/')[2]);

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
    template: `<div :id="'shape'+id" v-bind:style="styleObject"></div>`,
    data: function() {
        return {
            id: null,
            properties: {
                color: 'white',
                left: 0,
                top: 0,
                width: 0,
                height: 0,
                opacity: 1
            }
        }
    },
    computed: {
        styleObject: {
            // cache: false,
            get: function() {
                return {
                    'backgroundColor': this.properties.color,
                    'position': 'absolute',
                    'left': this.properties.left + 'px',
                    'top': this.properties.top + 'px',
                    'width': this.properties.width + 'px',
                    'height': this.properties.height + 'px',
                    'border': '1px solid gray',
                    'overflow': 'visible',
                    'opacity': this.properties.opacity
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
    newShapeVM.properties.color = message.color;
    newShapeVM.properties.width = message.width;
    newShapeVM.properties.height = message.height;
    newShapeVM.properties.top = message.top;
    newShapeVM.properties.left = message.left;
    newShapeVM.properties.opacity = message.opacity;

    newShapeVM.$mount();
    document.getElementById("mobileCanvas").appendChild(newShapeVM.$el);

    allShapes[id] = newShapeVM
    return newShapeVM
}

socket.on('message-from-server', function(data) {
    console.log("Received something from server: " + JSON.stringify(data));

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
            editedShapeVM.properties.color = data.message.color;
            editedShapeVM.properties.left = data.message.left;
            editedShapeVM.properties.top = data.message.top;
            editedShapeVM.properties.width = data.message.width;
            editedShapeVM.properties.height = data.message.height;
            editedShapeVM.properties.opacity = data.message.opacity;
        } else {
            console.log("Are we editing a shape that was not created????? WERID!")
        }

    }
    if (data.type == "NEW_ANIMATION") {
        console.log("Received NEW_ANIMATION: " + JSON.stringify(data.message))

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
                console.log("CURRENT ANIMATION FOR MODEL " + shapeModelId +  " JSON: " + JSON.stringify(newAnimation[shapeModelId]))

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
            eachShapeElement.style.webkitAnimation = "mymove" + shapeModelId + " 2s ease-in 0s infinite normal forwards running"; /* Safari 4.0 - 8.0 */
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

let initialTouchPosition
let targetElement

document.addEventListener("touchstart", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        saveEvent(event);
    } else {
        //We are interacting
        initialTouchPosition = { x: event.pageX, y: event.pageY }
    }
});

document.addEventListener("touchmove", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        saveEvent(event);
    } else {
        //We are interaction
        // allShapes[0].version.top = ''
    }
});

document.addEventListener("touchend", function(event) {
    event.preventDefault();
    if (mobileCanvasVM.isRecording) {
        saveEvent(event);
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
