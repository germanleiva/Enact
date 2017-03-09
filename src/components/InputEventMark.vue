<template>
    <div v-if="inputEvent !== undefined">
        <div v-for="touch in inputEvent.touches" :style="styleObject(touch)" v-on:mousedown="draggedInputEventMark"></div>
    </div>
</template>
<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore} from '../store.js'

export default {
    name: 'input-event-mark',
    props: ['initialVisualState', 'initialInputEvent'],
    template: ``,
    data: function() {
        return { visualState: this.initialVisualState }
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
        styleObject(aTouch) {
            return {
                borderRadius: '15px',
                position: 'absolute',
                left: aTouch.x + 'px',
                top: aTouch.y + 'px',
                width: aTouch.radiusX * 2 + 'px',
                height: aTouch.radiusY * 2 + 'px',
                backgroundColor: this.visualState ? 'red' : 'pink',
                'z-index': 9999
            };
        }
    }
}
</script>