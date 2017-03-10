<template>
    <div v-if="inputEvent !== undefined" v-on:mousedown="draggedInputEventMark">
        <touch v-for="touch in inputEvent.touches" :input-event="inputEvent" :touch="touch" :isActive="visualState != undefined"><touch>
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
        }
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
                let newIndex = Math.max(Math.min(initialIndex + indexVariation, globalStore.inputEvents.length - 1), 0);
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
    }
}
</script>