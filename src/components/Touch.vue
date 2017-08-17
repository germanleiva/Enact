<template>
    <div :style="styleObject" v-on:mouseover="mouseOver" v-on:mouseout="mouseOut" v-on:mousedown="draggedInputEventMark">
<!--         <linea :start-point="startPoint" :end-point="endPoint" :line-color="isActive?'blue':'black'" :style="{'z-index': 300}"></linea>
 -->
         <div v-show="showCenterPoint" :id="relevantCenterPoint.namePrefix + '-' + touch.id" :style="relevantCenterPointStyle" @mousedown="mouseDownStartedOnCenterRelevantPoint"></div>
    </div>
</template>
<script>

import Vue from 'vue'
import {extendArray} from '../collections.js'
extendArray(Array);
import Distance from "./Distance.vue"
// import Linea from "./Linea.vue"
import {globalStore, RelevantPoint, MeasureModel, ObjectLink} from '../store.js'

export default {
    name: 'touch',
    props: ['parentVisualState','touch','isActive'],
    template: ``,
    data: function() {
        return {
            isHovered: false,
            relevantCenterPoint: new RelevantPoint(this.touch, 'center', 0.5, 0.5),
            centerPointSize: 10
        }
    },
    components: {
        // Linea
    },
    computed: {
        styleObject() {
            let opacity = 0.3
            let color = 'red'
            if (this.touch.highlight) {
                color = 'blue'
                opacity = 0.5
            } else {
                if (this.isActive) {
                    color = 'black'
                    opacity = 0.5
                }
            }
            return {
                borderRadius: "50%",
                position: 'absolute',
                left: (this.touch.x - this.touch.radiusX) + 'px',
                top: (this.touch.y - this.touch.radiusY) + 'px',
                width: (this.touch.radiusX * 2) + 'px',
                height: (this.touch.radiusY * 2) + 'px',
                // backgroundColor: this.visualState ? 'red' : 'pink',
                backgroundColor: color,
                opacity: opacity,
                // transform: "rotate(" + aTouch.rotationAngle + "deg)",

                // 'z-index': 200
            };
        },
        showCenterPoint() {
            return this.isHovered && globalStore.toolbarState.measureMode
        },
        relevantCenterPointStyle() {
            return {
                borderRadius: "50%",
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: this.centerPointSize + 'px',
                height: this.centerPointSize + 'px',
                marginLeft: -this.centerPointSize/2 + 'px',
                marginTop: -this.centerPointSize/2 + 'px',
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

            this.$parent.measureStartedOnRelevantPoint(e,this.relevantCenterPoint,'touch',this.touch.id)
            console.log("Touch >> mouseDownStartedOnCenterRelevantPoint")
        },
        draggedInputEventMark(e) {
            console.log("Touch >> draggedInputEventMark")
            e.preventDefault();
            e.stopPropagation();

            if (e.metaKey) {
                //Let's draw a line to the rule, we can create a measure from this point to the mouse
                let newMeasureModel = new MeasureModel(this.parentVisualState,{type:'touch',id:this.touch.id,handler:undefined})
                newMeasureModel.cachedInitialPosition = {x:e.pageX,y:e.pageY}
                newMeasureModel.cachedFinalPosition = {x:e.pageX,y:e.pageY}

                const DistanceVM = Vue.extend(Distance);
                let newDistanceVM = new DistanceVM({propsData: {measureModel: newMeasureModel , isLink: true}})
                newDistanceVM.measureColor = 'black';
                newDistanceVM.$mount()
                window.document.body.appendChild(newDistanceVM.$el);

                globalStore.currentLink = new ObjectLink({visualState:this.parentVisualState,object:this.touch})
                if (e.shiftKey) {
                    globalStore.currentLink.shifted = true
                }

                var moveHandler = function(e) {
                    newMeasureModel.cachedFinalPosition.x = e.pageX
                    newMeasureModel.cachedFinalPosition.y = e.pageY
                    globalStore.currentLink.toggleObjectLink(true)
                }.bind(this);
                window.addEventListener('mousemove', moveHandler, false);

                var upHandler
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
            } else {
                this.$parent.draggedInputEventMark(e)
            }
        },
    }
}
</script>