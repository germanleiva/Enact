<template>
    <div :style="styleObject">
        <linea :start-point="startPoint" :end-point="endPoint" :line-color="isActive?'blue':'black'" :style="{'z-index': 300}"></linea>
    </div>
</template>
<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import Linea from "./Linea.vue"
import {globalStore} from '../store.js'

export default {
    name: 'touch',
    props: ['initialInputEvent','initialTouch'],
    template: ``,
    data: function() {
        return { isActive: false }
    },
    components: {
        Linea
    },
    computed: {
        styleObject() {
            return {
                borderRadius: "50%",
                position: 'absolute',
                left: (this.initialTouch.x - this.initialTouch.radiusX) + 'px',
                top: (this.initialTouch.y - this.initialTouch.radiusY) + 'px',
                width: (this.initialTouch.radiusX * 2) + 'px',
                height: (this.initialTouch.radiusY * 2) + 'px',
                // backgroundColor: this.visualState ? 'red' : 'pink',
                backgroundColor: 'red',
                opacity: this.isActive ? 1 : 0.3,
                // transform: "rotate(" + aTouch.rotationAngle + "deg)",

                // 'z-index': 200
            };
        },
        startPoint() {
            return {x: this.initialTouch.radiusX, y: this.initialTouch.radiusY}
            // return {x: 0, y: 0}
        },
        endPoint() {
            if (this.nextTouch) {
                let nextTouchCenterX = this.nextTouch.x
                let nextTouchCenterY = this.nextTouch.y

                return {x:nextTouchCenterX + this.nextTouch.radiusX - this.initialTouch.x , y: nextTouchCenterY  + this.nextTouch.radiusY - this.initialTouch.y}
            }
            return undefined
        },
        nextTouch() {
            let currentInputEventIndex = globalStore.inputEvents.indexOf(this.initialInputEvent)

            let nextInputEvent = globalStore.inputEvents[currentInputEventIndex + 1]

            if (!nextInputEvent) {
                return undefined
            }

            //I have a next inputEvent
            let myTouch = this.initialTouch;

            //find should return undefined if the element isn't found in the array
            return nextInputEvent.touches.find(aTouch => aTouch.identifier == myTouch.identifier)

        },
    },
    methods: {
    }
}
</script>