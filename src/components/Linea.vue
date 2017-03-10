<template>
    <!-- <div v-bind:style="styleObject">
    </div> -->

    <div :style="styleObject" v-if="endPoint != undefined">
        <svg :style="svgStyleObject">
            <g fill= "none">
                <path stroke-linecap="round" :stroke="lineColor" :stroke-width="strokeWidth" :d="path"/>
                <!-- <line stroke-linecap="round" :x1="deltaX < 0 ? width : 0" :y1="deltaY < 0 ? height : 0" :x2="deltaX" :y2="deltaY" :stroke="lineColor" :stroke-width="strokeWidth"/> -->
            </g>
        </svg>
    <div>
</template>
<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore} from '../store.js'

export default {
    name: 'linea',
    props: ["startPoint","endPoint","lineColor"],
    data: function() {
        return {
            // startPoint: this.initialStartPoint,
            // endPoint: this.initialEndPoint
        }
    },
    computed: {
        styleObject: function() {
            return {
                // 'backgroundColor': 'red',
                'position': 'absolute',
                'left': this.startingX + 'px',
                'top': this.startingY + 'px',
                'width': this.width + 'px',
                'height': this.height + 'px',
                // 'pointer-events': this.shouldShowPoints && this.measureModel.to.id?'auto':'none' //This is a hack to let the mouse event PASS-THROUGH the measure
            }
        },
        svgStyleObject: function() {
            return {
                // 'backgroundColor': 'red',
                'position': 'absolute',
                'width': this.width + 'px',
                'height': this.height + 'px',
                // 'pointer-events': this.shouldShowPoints && this.measureModel.to.id?'auto':'none' //This is a hack to let the mouse event PASS-THROUGH the measure
            }
        },
        path: function() {
            let pathStartingX = this.deltaX < 0 ? this.width : 0
            let pathStartingY = this.deltaY < 0 ? this.height : 0
            return "M"+pathStartingX+ " "+pathStartingY+" l"+this.deltaX+" "+this.deltaY
        },
        width() {
            return Math.abs(this.deltaX)
        },
        height() {
            return Math.abs(this.deltaY)
        },
        strokeWidth() {
            return "3px"
        },
        deltaX() {
            return this.endPoint.x - this.startPoint.x
        },
        deltaY() {
            return this.endPoint.y - this.startPoint.y
        },
        startingX: function() {
            let initialX = this.startPoint.x
            if (initialX >= this.endPoint.x) {
                initialX = this.startPoint.x + this.deltaX
            }
            return initialX
        },
        startingY: function() {
            let initialY = this.startPoint.y
            if (initialY >= this.endPoint.y) {
                initialY = this.startPoint.y + this.deltaY
            }
            return initialY
        },

    },
    destroyed: function() {
        console.log("WE DESTROYED LINE")
    },
    methods: {

    }
}
</script>