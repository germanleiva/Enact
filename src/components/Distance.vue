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
        <line :style="lineStyle" :x1="initialX" :y1="initialY" :x2="finalX" :y2="finalY" :stroke="measureColor" :stroke-width="strokeWidth" shape-rendering="geometricPrecision" v-on:mouseover="onMouseOver" v-on:mouseout="onMouseOut" :marker-start="markerStart" :marker-end="markerEnd" @mousedown="mouseDownStartedOnMeasure"></line>
        <!-- Invisible line to account for the mouseover/out event -->
        <!-- <line :style="lineStyle" v-if="!isLinking" :x1="initialX" :y1="initialY" :x2="finalX" :y2="finalY" :stroke="measureColor" :stroke-opacity="0" :stroke-width="6" v-on:mouseover="onMouseOver" v-on:mouseout="onMouseOut"></line> -->
        <circle v-for="eachRelevantPoint in measureModel.relevantPoints" v-if="shouldShowPoints" v-show="isHovered" :id="eachRelevantPoint.namePrefix + '-' + measureModel.id" :cx="initialX + eachRelevantPoint.centerX" :cy="initialY + eachRelevantPoint.centerY" :r="pointSize / 2" @mousedown="mouseDownStartedOnRelevantPoint($event,eachRelevantPoint)" v-on:mouseover="onMouseOver" v-on:mouseout="onMouseOut"></circle>
    </svg>
</template>
<script>

import Vue from 'vue'
import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore,globalBus,logger,MeasureModel, ObjectLink} from '../store.js'

export default {
    name: 'distance',
    props: {
        parentVisualState: {
            type: Object,
            required: false
        },
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
            measureColor: this.measureModel.color,
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
            let value = this.isLinking || !globalStore.toolbarState.measureMode ?'none':'auto'
            if (globalStore.isMetaPressed) {
                value = 'auto'
            }
            return {
                'pointer-events': value
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
            globalStore.codeEditor.getInputField().blur()

            this.$parent.measureStartedOnRelevantPoint(e,aRelevantPoint,'distance',this.measureModel.id)
        },
        mouseDownStartedOnMeasure(e) {
            globalStore.codeEditor.getInputField().blur()

            if (!this.isLink && e.metaKey) {
                e.preventDefault()
                e.stopPropagation();
                //Let's draw a line to the rule, we can create a measure from this point to the mouse
                let newMeasureModel = new MeasureModel(this.parentVisualState,{type:'distance',id:this.measureModel.id,handler:undefined})
                newMeasureModel.cachedInitialPosition = {x:e.pageX,y:e.pageY}
                newMeasureModel.cachedFinalPosition = {x:e.pageX,y:e.pageY}

                const DistanceVM = Vue.extend(this.$options.components.Distance);
                let newDistanceVM = new DistanceVM({propsData: {measureModel: newMeasureModel , isLink: true}})
                newDistanceVM.measureColor = 'black';
                newDistanceVM.$mount()
                window.document.body.appendChild(newDistanceVM.$el);

                globalStore.currentLink = new ObjectLink({visualState:this.parentVisualState,object:this.measureModel})
                if (e.shiftKey) {
                    globalStore.currentLink.shifted = true
                }

                let moveHandler = function(e) {
                    newMeasureModel.cachedFinalPosition.x = e.pageX
                    newMeasureModel.cachedFinalPosition.y = e.pageY
                    globalStore.currentLink.toggleObjectLink(true)
                }.bind(this);
                window.addEventListener('mousemove', moveHandler, false);

                let upHandler
                upHandler = function(e) {
                    // This handler should be trigger AFTER the rule upHandler"
                    globalStore.currentLink.toggleObjectLink(false)
                    globalStore.currentLink = undefined;
                    newMeasureModel.deleteYourself();
                    window.document.body.removeChild(newDistanceVM.$el);
                    newDistanceVM.$destroy();
                    window.removeEventListener('mousemove', moveHandler, false);
                    window.removeEventListener('mouseup', upHandler, false);
                }.bind(this);
                window.addEventListener('mouseup', upHandler, false);

                return
            }
        }
    },
    beforeCreate: function () {
        this.$options.components.Distance = require('./Distance.vue')
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
line:hover {
    fill:gray;
}
</style>