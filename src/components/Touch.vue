<template>
    <div :style="styleObject" v-on:mouseover="mouseOver" v-on:mouseout="mouseOut" v-on:mousedown="draggedInputEventMark">
<!--         <linea :start-point="startPoint" :end-point="endPoint" :line-color="isActive?'blue':'black'" :style="{'z-index': 300}"></linea>
 -->
         <div v-show="showCenterPoint" :id="relevantCenterPoint.namePrefix + '-' + inputEvent.id" :style="relevantCenterPointStyle" @mousedown="mouseDownStartedOnCenterRelevantPoint">
    </div>
</template>
<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import Linea from "./Linea.vue"
import {globalStore, RelevantPoint} from '../store.js'

export default {
    name: 'touch',
    props: ['inputEvent','touch','isActive'],
    template: ``,
    data: function() {
        return {
            isHovered: false,
            relevantCenterPoint: new RelevantPoint(this, 'center', 0.5, 0.5)
        }
    },
    components: {
        Linea
    },
    computed: {
        styleObject() {
            return {
                borderRadius: "50%",
                position: 'absolute',
                left: (this.touch.x - this.touch.radiusX) + 'px',
                top: (this.touch.y - this.touch.radiusY) + 'px',
                width: (this.touch.radiusX * 2) + 'px',
                height: (this.touch.radiusY * 2) + 'px',
                // backgroundColor: this.visualState ? 'red' : 'pink',
                backgroundColor: this.isActive ? 'black':'red',
                opacity: this.isActive ? 0.5 : 0.3,
                // transform: "rotate(" + aTouch.rotationAngle + "deg)",

                // 'z-index': 200
            };
        },
        showCenterPoint() {
            return this.isHovered && globalStore.toolbarState.measureMode
        },
        relevantCenterPointStyle() {
            const size = 10
            return {
                borderRadius: "50%",
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: size + 'px',
                height: size + 'px',
                marginLeft: -size/2 + 'px',
                marginTop: -size/2 + 'px',
                backgroundColor: 'white'
            }
        },
        startPoint() {
            return {x: this.touch.radiusX, y: this.touch.radiusY}
            // return {x: 0, y: 0}
        },
        endPoint() {
            if (this.nextTouch) {
                let nextTouchCenterX = this.nextTouch.x
                let nextTouchCenterY = this.nextTouch.y

                return {x:nextTouchCenterX + this.nextTouch.radiusX - this.touch.x , y: nextTouchCenterY  + this.nextTouch.radiusY - this.touch.y}
            }
            return undefined
        },
        nextTouch() {
            let currentInputEventIndex = globalStore.inputEvents.indexOf(this.inputEvent)

            let nextInputEvent = globalStore.inputEvents[currentInputEventIndex + 1]

            if (!nextInputEvent) {
                return undefined
            }

            //I have a next inputEvent
            let myTouch = this.touch;

            //find should return undefined if the element isn't found in the array
            return nextInputEvent.touches.find(aTouch => aTouch.identifier == myTouch.identifier)
        },

    },
    methods: {
        mouseOver(e) {
            e.preventDefault()
            // console.log("mouseOver")
            this.isHovered = true
        },
        mouseOut(e) {
            e.preventDefault()
            // console.log("mouseOut")
            this.isHovered = false
        },
        mouseDownStartedOnCenterRelevantPoint(e) {
            e.preventDefault()
            e.stopPropagation()

            this.$parent.measureStartedOnRelevantPoint(e,this.relevantCenterPoint,'input',this.touch.id)
            console.log("Touch >> mouseDownStartedOnCenterRelevantPoint")
        },
        draggedInputEventMark(e) {
            if (globalStore.toolbarState.measureMode) {
                return
            }
            e.preventDefault();
            console.log("Touch >> draggedInputEventMark")
            this.$parent.draggedInputEventMark(e)
        },
    }
}
</script>