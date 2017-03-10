<template>
    <div class="button is-dark mark" :style="styleObject" v-on:mousedown="draggingStartedVisualStateMark"><slot></slot></div>
</template>

<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore} from '../store.js'

export default {
    name: 'visual-state-mark',
    props: ['visualState'],
    data: function() {
        return {

        }
    },
    computed: {
        styleObject() {
            return {
                left: this.visualState.percentageInTimeline + '%'
            }
        }
    },
    methods: {
        draggingStartedVisualStateMark(e) {
            e.stopPropagation()
            e.preventDefault()

            let visualStateMark = e.target;
            let mouseTargetOffsetX = e.x - e.target.offsetLeft;
            let mouseTargetOffsetY = e.y - e.target.offsetTop;

            this.visualState.showAllInputEvents = true;

            let inputTimelineElement = this.$el.parentElement;
            let moveHandler = function(e) {
                e.stopPropagation();
                e.preventDefault();
                let percentageInTimeline = (e.x - mouseTargetOffsetX) * 100 / inputTimelineElement.clientWidth;
                percentageInTimeline = Math.max(Math.min(percentageInTimeline, 100), 0);

                // visualStateMark.style.left = percentageInTimeline + '%';

                let totalEventCount = globalStore.inputEvents.length
                let index = Math.round(totalEventCount * percentageInTimeline / 100)
                index = Math.max(Math.min(index, totalEventCount - 1), 0);

                let correspondingInputEvent = globalStore.inputEvents[index]

                // console.log("% in timeline: " + percentageInTimeline + ". Total events:" + totalEventCount + ". index: " + index + ". Event: " + JSON.stringify(correspondingInputEvent));

                this.visualState.currentInputEvent = correspondingInputEvent;
            }.bind(this);
            window.addEventListener('mousemove', moveHandler, false);

            var upHandler
            upHandler = function(e) {
                e.stopPropagation();
                e.preventDefault();
                this.visualState.showAllInputEvents = false;
                window.removeEventListener('mousemove', moveHandler, false);
                window.removeEventListener('mouseup', upHandler, false);
            }.bind(this);
            window.addEventListener('mouseup', upHandler, false);

        }
    }
}
</script>

<style scoped>
.mark {
    width: 40px;
    height: 40px;
    position: absolute;
}
</style>