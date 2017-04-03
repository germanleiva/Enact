<template>
    <div v-if="inputEvent !== undefined">
        <touch ref="touchesVM" v-for="touch in inputEvent.touches" :parent-visual-state="visualState" :touch="touch" :is-active="visualState != undefined"><touch>
    </div>
</template>
<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import Touch from "./Touch.vue"
import {globalStore} from '../store.js'

export default {
    name: 'input-event-mark',
    props: ['visualState', 'initialInputEvent'],
    template: ``,
    data: function() {
        return {
        }
    },
    components: {
        Touch
    },
    computed: {
        inputEvent() {
            if (this.visualState) {
                return this.visualState.currentInputEvent
            }
            return this.initialInputEvent
        },
    },
    methods: {
        draggedInputEventMark(e) {
            e.preventDefault();

            let mouseMoveHandler;

            let startingMousePositionX = e.x;

            let initialIndex = globalStore.inputEvents.indexOf(this.inputEvent);
            mouseMoveHandler = function(e) {
                let deltaX = e.x - startingMousePositionX
                let indexVariation = Math.floor(deltaX / 2);
                let newIndex = Math.max(Math.min(initialIndex + indexVariation, globalStore.inputEvents.length - 1 -1), 0); //TODO We are using -2 instead of -1 to ignore the last event touchend

                // console.log("Total events:" + globalStore.inputEvents.length + ". index: " + newIndex + ". Event: " + JSON.stringify(globalStore.inputEvents[newIndex]));

                this.visualState.currentInputEvent = globalStore.inputEvents[newIndex];
                this.visualState.showAllInputEvents = true;
            }.bind(this)

            let mouseUpHandler;
            mouseUpHandler = function(e) {
                this.visualState.showAllInputEvents = false;
                window.removeEventListener('mousemove', mouseMoveHandler, false);
                window.removeEventListener('mouseup', mouseUpHandler, false);
            }.bind(this)

            window.addEventListener('mousemove', mouseMoveHandler, false);
            window.addEventListener('mouseup', mouseUpHandler, false);
        },
        measureStartedOnRelevantPoint(e,aRelevantPoint,fromType,fromId) {
            this.$parent.measureStartedOnRelevantPoint(e,aRelevantPoint,fromType,fromId)
        },
        handlerFor(canvasX,canvasY) {
            if (this.$refs.touchesVM) {
                for (let i=0; i < this.$refs.touchesVM.length; i++) {
                    let touchVM = this.$refs.touchesVM[i];
                    let centerPoint = touchVM.relevantCenterPoint;
                    console.log("Checking x: " + (canvasX - touchVM.$el.offsetLeft) + " y: " + (canvasY - touchVM.$el.offsetTop));
                    console.log("Against x: " + centerPoint.centerX + " y: " + centerPoint.centerY);

                    if (centerPoint.isInside(canvasX - touchVM.$el.offsetLeft,canvasY - touchVM.$el.offsetTop,touchVM.centerPointSize)) {
                        console.log("IS INSIDE!, return type = touch");

                        return {type:'touch',id: touchVM.touch.id, handler: centerPoint.namePrefix}
                    } else {
                        console.log("IS NOT INSIDE");
                    }
                }
            }
        }
    }
}
</script>