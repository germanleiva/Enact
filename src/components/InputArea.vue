<template>
    <div id='inputArea'>
       <a class="button is-primary is-medium" v-on:click="startPlaying"><span class="icon is-small"><i class="fa fa-play"></i></span></a>
        <div class="inputTimeline">
            <visual-state-mark v-for="vs in visualStates" :initial-visual-state="vs">{{"VS"+visualStates.indexOf(vs)}}</visual-state-mark>
        </div>
        <a class="button is-medium" :class="{'is-inverted' : !isRecording , ' is-danger' : isRecording}" v-on:click="toggleRecording"><span class="icon is-small"><i :class="{'fa' : true , 'fa-circle' : !isRecording, 'fa-square' : isRecording}"></i></span></a>
    </div>
</template>

<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore} from '../store.js'
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

    globalStore.socket.on('message-from-server-input-event', function(data) {
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

        if (anInputEvent.type == 'touchend') {
            amountOfTouchesLeft -= 1;
            if (amountOfTouchesLeft == 0) {
                globalStore.isRecording = false
                globalStore.socket.emit('message-from-desktop', { type: "STOP_RECORDING", message: undefined })
                for (var i = 0; i < globalStore.visualStates.length; i++) {
                    let eachVS = globalStore.visualStates[i];
                    if (!eachVS.currentInputEvent) {
                        let correspondingIndex = Math.floor(eachVS.percentageInTimeline / 100 * (globalStore.inputEvents.length /*-1*/))
                        eachVS.currentInputEvent = globalStore.inputEvents[correspondingIndex]
                    }
                }
            }
        } else {
            amountOfTouchesLeft = Math.max(amountOfTouchesLeft, anInputEvent.touches.length)

            if (anInputEvent.type == "touchstart") {
                globalStore.inputEvents.removeAll();
            } else if (anInputEvent.type == 'touchmove') {
                drawTouches()
            } else {
                console.log("UNKNOWN INPUT TYPE");
            }
        }

        globalStore.inputEvents.push(anInputEvent);
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
                let eachShapeKey = 'shape'+i
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
        }
    }
}
</script>

<style >

</style>