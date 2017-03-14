<template>
    <div id='inputArea'>
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
import {globalStore, globalBus} from '../store.js'
import VisualStateMark from './VisualStateMark.vue'

export default {
  name: 'input-area',
  data () {
    return {
        toolbarState: globalStore.toolbarState
    }
  },
  components: {
    'visual-state-mark':VisualStateMark
  },
  mounted: function() {
    //TODO this implementation of amountOfTouchesLeft does not consider touchcancel or touchfailed
    let amountOfTouchesLeft = 0

    globalBus.$on('message-from-device-INPUT_EVENT', function(data) {
        // console.log(data)
        function drawTouches() {
            let points = globalStore.inputEvents;
            globalStore.context.clearRect(0, 0, globalStore.context.canvas.width, globalStore.context.canvas.height);
            globalStore.context.lineWidth = 3;
            for (let i = 1; i < points.length; i++) {
                for (let j = 0; j < Math.max(Math.min(points[i - 1].touches.length, points[i].touches.length), 1); j++) {
                    globalStore.context.beginPath();
                    globalStore.context.moveTo(points[i - 1].touches[j].x, points[i - 1].touches[j].y);
                    globalStore.context.lineTo(points[i].touches[j].x, points[i].touches[j].y);
                    globalStore.context.strokeStyle = "black";
                    globalStore.context.stroke();
                }
            }
        }

        let anInputEvent = data.message
        anInputEvent['testShapes'] = []

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

                drawTouches()
                break;
            }
            case 'touchend': {
                globalStore.inputEvents.push(anInputEvent);

                //touches.length it's the current amount of tracked touches, not the ones ended
                amountOfTouchesLeft = amountOfTouchesLeft - 1

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
        toggleRecording() {
            this.isRecording = !this.isRecording;
            if (this.isRecording) {
                globalStore.socket.emit('message-from-desktop', { type: "START_RECORDING", message: undefined })
            }
        },
        startPlaying() {
            let animation = {}

            let hiddedShapesKeys = []
            for (let i = 0; i < globalStore.shapeCounter; i++) {
                let shapeKeyframes = {}
                let eachShapeKey = 'R'+i
                animation[eachShapeKey] = shapeKeyframes

                let createKeyframe = function(aVisualState, currentPercentage) {
                    let currentInputEventIndex = globalStore.inputEvents.indexOf(aVisualState.currentInputEvent)
                    if (currentPercentage == undefined) {
                        currentPercentage = Math.max(Math.floor(currentInputEventIndex * 100 / globalStore.inputEvents.length), 0);
                    }
                    let shapeInThisVisualState = aVisualState.shapeFor(eachShapeKey)
                    if (shapeInThisVisualState) {

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

            globalStore.socket.emit('message-from-desktop', { type: "NEW_ANIMATION", message: animation })
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

            let firstStateShapes = globalStore.visualStates[0].shapesDictionary
            for (let eachShapeId in firstStateShapes) {
                globalStore.socket.emit('message-from-desktop', { type: "EDIT_SHAPE", id: eachShapeId, message: firstStateShapes[eachShapeId].propertyObject })
            }

            //Removing testShapes from the inputEvent
            let leanInputEvents = []
            for (let eachInputEvent of globalStore.inputEvents) {
                let eachInputEventCopy = {}
                for (let inputEventKey in eachInputEvent) {
                    if (inputEventKey != 'testShapes') {
                        eachInputEventCopy[inputEventKey] = eachInputEvent[inputEventKey]
                    }
                }
                leanInputEvents.push(eachInputEventCopy)
            }

            globalStore.socket.emit('message-from-desktop', { type: "TEST_EVENTS", message: leanInputEvents, eventIndexes: relevantEventsIndex })
        }
    }
}
</script>

<style >

</style>