<template>
    <svg :style="svgStyle" width="1" height="1">
        <line :style="lineStyle" :x1="initialX" :y1="initialY" :x2="finalX" :y2="finalY" :stroke="measureColor" :stroke-width="strokeWidth" shape-rendering="geometricPrecision" ></line>
        <circle ref="relevantPointsElements" v-for="eachRelevantPoint in measureModel.relevantPoints" v-if="shouldShowPoints" v-show="isHovered" :id="eachRelevantPoint.namePrefix + '-' + measureModel.id" :cx="(initialX + finalX)/2" :cy="(initialY + finalY)/2" :r="5" @mousedown="mouseDownStartedOnRelevantPoint($event,eachRelevantPoint)"></circle>
        <!-- Invisible line to account for the mouseover/out event, measureModel.cachedFinalPosition == undefined means that we are moving the line with the mouse -->
        <line :style="lineStyle" v-if="!isLinking" :x1="initialX" :y1="initialY" :x2="finalX" :y2="finalY" :stroke="measureColor" :stroke-opacity="0" :stroke-width="10" v-on:mouseover="onMouseOver" v-on:mouseout="onMouseOut"></line>
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
            measureColor: 'red'
        }
    },
    computed: {
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
            return {
                'left': aPoint.left + 'px',
                'top': aPoint.top + 'px',
                'width': '10px',
                'height': '10px',
                'background-color': 'red',
                'border': '1px solid #000000',
                'position':'absolute',
                'border-radius': '5px'
            }
        },
        handlerFor(x,y) {
            if (this.$refs.relevantPointsElements) {
                for(let eachHandlerDOMElement of this.$refs.relevantPointsElements) {
                    let isInside = x >= this.measureModel.initialPoint.x + eachHandlerDOMElement.offsetLeft && x <= this.measureModel.initialPoint.x + eachHandlerDOMElement.offsetLeft + eachHandlerDOMElement.offsetWidth && y >= this.measureModel.initialPoint.y + eachHandlerDOMElement.offsetTop && y <= this.measureModel.initialPoint.y + eachHandlerDOMElement.offsetTop + eachHandlerDOMElement.offsetHeight
                    if (isInside) {
                        return {type:'distance',id: this.measureModel.id, handler: eachHandlerDOMElement.getAttribute('id').split('-')[0]}
                    }
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
circle:hover {
    fill:gray;
}
</style>