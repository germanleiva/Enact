<template>
    <div id='timelineArea'>
       <a class="button is-primary is-medium" v-on:click="startPlaying"><span class="icon is-small"><i class="fa fa-play"></i></span></a>
        <div class="inputTimeline">
            <visual-state-mark v-for="vs in visualStates" :initial-visual-state="vs">{{"VS"+visualStates.indexOf(vs)}}</visual-state-mark>
        </div>
        <a class="button is-medium" :class="{'is-inverted' : !isRecording , ' is-danger' : isRecording}" v-on:click="toggleRecording"><span class="icon is-small"><i :class="{'fa' : true , 'fa-circle' : !isRecording, 'fa-square' : isRecording}"></i></span></a>
    </div>
</template>

<script>

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
            debugger;
            let hiddedShapesKeys = []
            for (let i = 0; i < globalStore.shapeCounter; i++) {
                let shapeKeyframes = {}
                let eachShapeKey = 'shape'+i
                animation[eachShapeKey] = shapeKeyframes

                let createKeyframe = function(aVisualState, currentPercentage) {
                    debugger;
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