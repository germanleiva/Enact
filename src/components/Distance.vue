<template>
    <svg :style="svgStyle" width="1" height="1" v-if="measureModel.isAvailable">
        <defs>
            <marker v-if="!isLink" id="marker-lineStart" markerWidth="10" markerHeight="10" refX="0" refY="5" orient="auto" fill="none">
                <path d="M 0,0 L 0,10" stroke="black" stroke-width="2"/>
            </marker>
            <marker v-if="!isLink" id="marker-lineEnd" markerWidth="10" markerHeight="10" refX="0" refY="5" orient="auto" fill="none">
                <path d="M 0,0 L 0,10" stroke="black" stroke-width="2"/>
            </marker>
            <marker v-if="isLink" id="marker-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z"/>
            </marker>
        </defs>
        <line :style="lineStyle" :x1="initialX" :y1="initialY" :x2="finalX" :y2="finalY" :stroke="measureColor" :stroke-width="strokeWidth" shape-rendering="geometricPrecision" v-on:mouseover="onMouseOver" v-on:mouseout="onMouseOut" :marker-start="markerStart" :marker-end="markerEnd"></line>
        <!-- Invisible line to account for the mouseover/out event -->
        <!-- <line :style="lineStyle" v-if="!isLinking" :x1="initialX" :y1="initialY" :x2="finalX" :y2="finalY" :stroke="measureColor" :stroke-opacity="0" :stroke-width="6" v-on:mouseover="onMouseOver" v-on:mouseout="onMouseOut"></line> -->
        <circle v-for="eachRelevantPoint in measureModel.relevantPoints" v-if="shouldShowPoints" v-show="isHovered" :id="eachRelevantPoint.namePrefix + '-' + measureModel.id" :cx="initialX + eachRelevantPoint.centerX" :cy="initialY + eachRelevantPoint.centerY" :r="pointSize / 2" @mousedown="mouseDownStartedOnRelevantPoint($event,eachRelevantPoint)" v-on:mouseover="onMouseOver" v-on:mouseout="onMouseOut"></circle>
    </svg>
</template>
<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore,globalBus,logger} from '../store.js'

export default {
    name: 'distance',
    props: {
        measureModel: {
            type: Object,
            required: true
        },
        isLink: {
            type: Boolean,
            default: false
        }
    },
    data: function() {
        return {
            isHovered: false,
            measureColor: 'red',
            pointSize: 10,
        }
    },
    computed: {
        markerStart() {
            if (this.isLink) {
                return ""
            }
            return "url(#marker-lineStart)"
        },
        markerEnd() {
            if (this.isLink) {
                if (this.measureModel.width > 15 || this.measureModel.height > 15) {
                    return "url(#marker-arrow)"
                }
                return ""
            }
            return "url(#marker-lineEnd)"
        },
        shouldShowPoints: function() {
            return !this.isLinking && globalStore.toolbarState.measureMode
        },
        svgStyle: function() {
            return {
                'position' : 'absolute',
                'left': '0px',
                'top': '0px',
                'overflow': 'visible'
            }
        },
        lineStyle: function() {
            return {
                'pointer-events': this.isLinking || !globalStore.toolbarState.measureMode ?'none':'auto'
            }
        },
        initialX: function() {
            return this.measureModel.initialPoint.x
        },
        initialY: function() {
            return this.measureModel.initialPoint.y
        },
        finalX: function() {
            return this.measureModel.finalPoint.x
        },
        finalY: function() {
            return this.measureModel.finalPoint.y
        },
        strokeWidth() {
            if (this.measureModel.highlight) {
                return 4
            }
            return 2
        },
        isLinking() {
            // measureModel.cachedFinalPosition == undefined means that we are moving the line with the mouse
            return this.isLink || this.measureModel.cachedFinalPosition != undefined
        }

    },
    destroyed: function() {
        console.log("WE DESTROYED MEASURE")
    },
    // watch: {
    //     styleObject: function(val) {
    //         if (this.shapeModel()) {
    //             // console.log("IN COMPUTED styleObject the shapeModel().color is "+ this.shapeModel().color)

    //             if (globalStore.visualStates[0] === this.visualState) {
    //                 globalStore.socket.emit('message-from-desktop', { type: "EDIT_SHAPE", message: { id: this.shapeModel().id, color: this.shapeModel().color, width: this.shapeModel().width, height: this.shapeModel().height, top: this.shapeModel().top, left: this.shapeModel().left, opacity: this.shapeModel().opacity } })
    //            }
    //         } else {
    //             //I WAS DELETED
    //             console.log("Should i worry? " + this.shapeModelId)
    //         }
    //     }
    // },
    methods: {
        onMouseOver(e) {
            // console.log("Distance >> onMouseOver")
            e.preventDefault();
            if (this.measureModel.to.id) {
                this.isHovered = true
            }
        },
        onMouseOut(e) {
            // console.log("Distance >> onMouseOut")
            e.preventDefault();
            if (this.measureModel.to.id) {
                this.isHovered = false
            }
        },
        relevantPointStyleObject: function(aPoint) {
            const size = this.pointSize;
            return {
                'position':'absolute',
                'border-radius': '50%',
                'left': aPoint.left(size) + 'px',
                'top': aPoint.top(size) + 'px',
                'width': size+'px',
                'height': size+'px',
                'background-color': 'red'
            }
        },
        handlerFor(canvasX,canvasY) {
            for (let aRelevantPoint of this.measureModel.relevantPoints) {
                if (aRelevantPoint.isInside(canvasX - this.initialX, canvasY - this.initialY,this.pointSize)) {
                    return {type:'distance',id: this.measureModel.id, handler: aRelevantPoint.namePrefix}
                }
            }
            return undefined
        },
        mouseDownStartedOnRelevantPoint(e,aRelevantPoint){
            this.$parent.measureStartedOnRelevantPoint(e,aRelevantPoint,'distance',this.measureModel.id)
        }
    }
}
</script>
<style scoped>
line {
    stroke-linecap: round;
}
circle {
    fill: red;
    stroke-width: 1px;
}
/*circle:hover {
    fill:gray;
}*/
</style>