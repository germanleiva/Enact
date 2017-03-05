<template>
    <!-- <div v-bind:style="styleObject">
    </div> -->

    <div :style="styleObject" v-on:mouseover="onMouseOver" v-on:mouseout="onMouseOut">
        <svg :style="svgStyleObject">
            <g fill= "none">
                <path :stroke="measureColor" :stroke-width="strokeWidth" :d="path"/>
            </g>
        </svg>
        <div ref="relevantPointsElements" v-for="eachRelevantPoint in measureModel.relevantPoints" v-if="shouldShowPoints" v-show="isHovered" :id="eachRelevantPoint.namePrefix + '-' + measureModel.id" :style="relevantPointStyleObject(eachRelevantPoint)" @mousedown="mouseDownStartedOnRelevantPoint($event,eachRelevantPoint)">
        </div>
    <div>
</template>
<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore,globalBus,logger} from '../store.js'

export default {
    name: 'distance',
    props: ['measureModel'],
    data: function() {
        return {
            isHovered: false,
            measureColor: 'red'
        }
    },
    computed: {
        shouldShowPoints: function() {
            return globalStore.toolbarState.measureMode
        },
        styleObject: function() {
            return {
                // 'backgroundColor': 'red',
                'position': 'absolute',
                'left': this.startingX + 'px',
                'top': this.startingY + 'px',
                'width': Math.max(this.measureModel.width,2) + 'px',
                'height': Math.max(this.measureModel.height,2) + 'px',
                'pointer-events': this.shouldShowPoints && this.measureModel.to.id?'auto':'none' //This is a hack to let the mouse event PASS-THROUGH the measure
            }
        },
        svgStyleObject: function() {
            return {
                // 'backgroundColor': 'red',
                'position': 'absolute',
                'width': Math.max(this.measureModel.width,2) + 'px',
                'height': Math.max(this.measureModel.height,2) + 'px',
                'pointer-events': this.shouldShowPoints && this.measureModel.to.id?'auto':'none' //This is a hack to let the mouse event PASS-THROUGH the measure
            }
        },
        startingX: function() {
            let initialX = this.measureModel.initialPoint.x
            if (initialX >= this.measureModel.finalPoint.x) {
                initialX = this.measureModel.initialPoint.x + this.measureModel.deltaX
            }
            return initialX
        },
        startingY: function() {
            let initialY = this.measureModel.initialPoint.y
            if (initialY >= this.measureModel.finalPoint.y) {
                initialY = this.measureModel.initialPoint.y + this.measureModel.deltaY
            }
            return initialY
        },
        path: function() {
            let pathStartingX = this.measureModel.deltaX < 0 ? this.measureModel.width : 0
            let pathStartingY = this.measureModel.deltaY < 0 ? this.measureModel.height : 0
            return "M"+pathStartingX+ " "+pathStartingY+" l"+this.measureModel.deltaX+" "+this.measureModel.deltaY
        },
        strokeWidth() {
            if (this.measureModel.highlight) {
                return 5
            }
            return 2
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
            e.preventDefault();
            if (this.measureModel.to.id) {
                this.isHovered = true
            }
        },
        onMouseOut(e) {
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
            for(let eachHandlerDOMElement of this.$refs.relevantPointsElements) {
                let isInside = x >= this.measureModel.initialPoint.x + eachHandlerDOMElement.offsetLeft && x <= this.measureModel.initialPoint.x + eachHandlerDOMElement.offsetLeft + eachHandlerDOMElement.offsetWidth && y >= this.measureModel.initialPoint.y + eachHandlerDOMElement.offsetTop && y <= this.measureModel.initialPoint.y + eachHandlerDOMElement.offsetTop + eachHandlerDOMElement.offsetHeight
                if (isInside) {
                    return {type:'distance',id: this.measureModel.id, handler: eachHandlerDOMElement.getAttribute('id').split('-')[0]}
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