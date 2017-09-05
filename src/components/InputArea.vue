<template>
    <div id='inputArea'>
        <a class="button is-medium is-info" id="reset-button" title="Reset" v-on:click="refreshMobile"><span class="icon is-small"><i class="fa fa-refresh"></i></span></a><span>&nbsp;</span>
        <a class="button is-warning is-medium" v-on:click="startTesting"><span class="icon is-medium"><i class="fa fa-bug"></i></span></a><span>&nbsp;</span>
        <a class="button is-primary is-medium" v-on:click="startPlaying"><span class="icon is-small"><i class="fa fa-play"></i></span></a>
        <div class="inputTimeline">
            <visual-state-mark v-for="vs in visualStates" :visual-state="vs"></visual-state-mark>
        </div>
        <a class="button is-medium" :class="{'is-inverted' : !isRecording , ' is-danger' : isRecording}" v-on:click="toggleRecording"><span class="icon is-small"><i :class="{'fa' : true , 'fa-circle' : !isRecording, 'fa-square' : isRecording}"></i></span></a>
    </div>
</template>

<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore, globalBus, InputEvent} from '../store.js'
import VisualStateMark from './VisualStateMark.vue'

export default {
  name: 'input-area',
  data () {
    return {

    }
  },
  components: {
    'visual-state-mark':VisualStateMark
  },
  mounted: function() {
    //TODO this implementation of amountOfTouchesLeft does not consider touchcancel or touchfailed
    let amountOfTouchesLeft = 0

    globalBus.$on('message-from-device-INPUT_EVENT', function(data) {
        console.log(data)
        // function drawTouches() {
        //     let points = globalStore.inputEvents;
        //     globalStore.context.clearRect(0, 0, globalStore.context.canvas.width, globalStore.context.canvas.height);
        //     globalStore.context.lineWidth = 3;
        //     for (let i = 1; i < points.length; i++) {
        //         for (let j = 0; j < Math.max(Math.min(points[i - 1].touches.length, points[i].touches.length), 1); j++) {
        //             globalStore.context.beginPath();
        //             globalStore.context.moveTo(points[i - 1].touches[j].x, points[i - 1].touches[j].y);
        //             globalStore.context.lineTo(points[i].touches[j].x, points[i].touches[j].y);
        //             globalStore.context.strokeStyle = "black";
        //             globalStore.context.stroke();
        //         }
        //     }
        // }

        let anInputEvent = new InputEvent(data.message)

        switch (anInputEvent.type) {
            case 'touchstart': {
                if (amountOfTouchesLeft == 0) {
                    globalStore.removeInputEvents();
                    amountOfTouchesLeft = anInputEvent.touches.length //touches.length it's the current amount of tracked touches
                }
                if (anInputEvent.touches.length > amountOfTouchesLeft) {
                    amountOfTouchesLeft = anInputEvent.touches.length
                }
                globalStore.inputEvents.push(anInputEvent);

                break;
            }
            case 'touchmove': {
                globalStore.inputEvents.push(anInputEvent);

                // drawTouches()
                break;
            }
            case 'touchend': {
                globalStore.inputEvents.push(anInputEvent);

                //touches.length it's the current amount of tracked touches, not the ones ended
                amountOfTouchesLeft = Math.max(amountOfTouchesLeft - 1,0)

                if (amountOfTouchesLeft == 0) {
                    globalStore.isRecording = false
                    globalStore.socket.emit('message-from-desktop', { type: "STOP_RECORDING", message: undefined })
                    for (let eachVS of  globalStore.visualStates) {
                        let correspondingIndex = Math.floor(eachVS.percentageInTimeline / 100 * (globalStore.inputEvents.length - 1))
                        eachVS.currentInputEvent = globalStore.inputEvents[correspondingIndex]
                    }
                }
                break;
            }
            default: {
                 console.log("UNKNOWN INPUT TYPE: "+anInputEvent.type);
            }
        }

    }.bind(this));
  },
    computed: {
        visualStates: function() {
            return globalStore.visualStates
        },
        isRecording: {
            get: function() {
                return globalStore.isRecording
            },
            set: function(newValue) {
                globalStore.isRecording = newValue
            }
        }
    },
    methods: {
        refreshMobile() {
            globalStore.refreshMobile()
        },
        toggleRecording() {
            this.isRecording = !this.isRecording;
            if (this.isRecording) {
                globalStore.socket.emit('message-from-desktop', { type: "START_RECORDING", message: undefined })
            }
        },
        startPlaying() {
            let shapesKeysWithoutRepetition = {}
            for (let visualState of this.visualStates) {
                let isFirstVisualState = this.visualStates.first() == visualState
                for (let eachKey in visualState.shapesDictionary) {
                    if (!shapesKeysWithoutRepetition.hasOwnProperty(eachKey)) {
                        shapesKeysWithoutRepetition[eachKey] = isFirstVisualState
                    }
                }
            }

            let initialTimeStamp = globalStore.inputEvents.first().timeStamp
            let lastTimeStamp = globalStore.inputEvents.last().timeStamp
            let timeInMS = lastTimeStamp - initialTimeStamp

            let animation = {}
            let message = {duration:timeInMS, shapes:animation}

            let hiddedShapesKeys = []

            for (let eachShapeKey in shapesKeysWithoutRepetition) {
                let shapeKeyframes = {}
                animation[eachShapeKey] = shapeKeyframes

                let createKeyframe = function(aVisualState, currentPercentage) {
                    let currentInputEventIndex = globalStore.inputEvents.indexOf(aVisualState.currentInputEvent)
                    if (currentPercentage == undefined) {
                        currentPercentage = Math.max(/*Math.round*/(currentInputEventIndex * 100 / globalStore.inputEvents.length - 1), 0);
                    }
                    let shapeInThisVisualState = aVisualState.shapeFor(eachShapeKey)
                    if (shapeInThisVisualState) {
                        if (Object.keys(shapeKeyframes).length > 0 && /opacity:\s*?0/.test(shapeKeyframes[Object.keys(shapeKeyframes).last()])) {
                            shapeKeyframes[(currentPercentage-1) + '%'] = shapeInThisVisualState.cssText(0);
                        }
                        shapeKeyframes[currentPercentage + '%'] = shapeInThisVisualState.cssText();
                    } else {
                        if (currentPercentage == 0 || currentPercentage == 100) {
                            if (hiddedShapesKeys.indexOf(eachShapeKey) < 0) {
                                hiddedShapesKeys.push(eachShapeKey)
                            }
                            //We need to find in which visual state this shape first appeared, get the attributes and hide
                            for (let eachOtherVS of globalStore.visualStates) {
                                let missingShape = eachOtherVS.shapesDictionary[eachShapeKey]
                                if (missingShape) {
                                    shapeKeyframes[currentPercentage + '%'] = missingShape.cssText(0);

                                    break;
                                }
                            }
                        }

                    }
                }
                for (let eachVisualState of globalStore.visualStates) {
                    createKeyframe(eachVisualState)
                }

                if (!shapeKeyframes['0%']) {
                    createKeyframe(globalStore.visualStates.first(), 0)
                }

                if (!shapeKeyframes['100%']) {
                    createKeyframe(globalStore.visualStates.last(), 100)
                }
            }

            globalStore.socket.emit('message-from-desktop', { type: "NEW_ANIMATION", message: message })

            //Animate device visual state

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
                    // style.appendChild(document.createTextNode(""));
                }

                return style.sheet;
            })();


            let newAnimation = message.shapes;
            for (var shapeModelId in newAnimation) {
                var eachShapeElement = document.getElementById(`S0-${shapeModelId}`)
                if (!eachShapeElement) {
                    debugger; //This shouldn't happen
                    console.log("CURRENT ANIMATION FOR MODEL " + shapeModelId + " JSON: " + JSON.stringify(newAnimation[shapeModelId]))

                    let styleObject = CSSJSON.toJSON(newAnimation[shapeModelId]['0%']);

                    console.log("PARSED JSON: " + newAnimation[shapeModelId]['0%'])
                    eachShapeElement = mobileCanvasVM.createShapeVM(shapeModelId, styleObject).$el
                }

                var keyframeAnimationText = '@keyframes mymove' + shapeModelId + ' {\n'
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

                if (eachShapeElement.style.animation.length == 0) {

                    eachShapeElement.addEventListener("animationStart", function(e) {
                        console.log("animationStart")
                    });
                    eachShapeElement.addEventListener("animationIteration", function(e) {
                        console.log("animationIteration")
                    });
                    eachShapeElement.addEventListener("animationEnd", function(e) {
                        eachShapeElement.style.animation = "none"
                    });
                }
                //     // eachShapeElement.style.animation = "mymove"+shapeModelId +" 1s infinite";

                //     // animation: name duration timing-function delay iteration-count direction fill-mode play-state;
                //     eachShapeElement.style.webkitAnimation = "none"
                // }
                // eachShapeElement.style.webkitAnimation = "mymove" + shapeModelId + " 2s ease-in 0s 1 normal forwards running"; /* Safari 4.0 - 8.0 */
                eachShapeElement.style.animation = `mymove${shapeModelId} ${timeInMS}ms ease-in 0s 1 normal forwards running`; /* Safari 4.0 - 8.0 */
            }

            for (let inputEvent of globalStore.inputEvents) {
                let horribleDelay = 100
                let waitingTime =  inputEvent.timeStamp - initialTimeStamp + horribleDelay
                console.log("WAITING TIME " + waitingTime + " typeof " + typeof waitingTime)
                setTimeout(function() {
                    // globalStore.socket.emit('message-from-device', { type:"CURRENT_EVENT", message: eventObject });
                    globalStore.deviceVisualState.currentInputEvent = inputEvent
                },waitingTime)
            }
        },
        startTesting() {

            let relevantEventsIndex = undefined
            // let relevantEventsIndex = globalStore.visualStates.map(function(vs) {
            //     let anInputEvent = globalStore.inputEvents.indexOf(vs.currentInputEvent)
            //     let sendInputEvent = {}
            //     for (let eachInputEventKey in anInputEvent) {
            //         if (eachInputEventKey != 'testShapes') {
            //             sendInputEvent[eachInputEventKey] = anInputEvent[eachInputEventKey]
            //         }
            //     }
            //     return sendInputEvent
            // })

            //First we send the shapes as they look on the first visualState

            globalStore.refreshMobile()

            globalStore.socket.emit('message-from-desktop', { type: "TEST_EVENTS", message: globalStore.inputEvents.map(eachInputEvent => eachInputEvent.leanJSON), eventIndexes: relevantEventsIndex })
        }
    }
}
</script>

<style >
#reset-button{
    margin-left: 6px;
    z-index: 999;
}
</style>