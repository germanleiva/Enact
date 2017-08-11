<template>
    <div class="button mark" :class="classObject" :style="styleObject" v-on:mousedown="draggingStartedVisualStateMark">{{visualStateName}}</div>
</template>

<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore, globalBus, ShapeModel, RectangleModel} from '../store.js'

export default {
    name: 'visual-state-mark',
    props: ['visualState'],
    data: function() {
        return {

        }
    },
    computed: {
        classObject() {
            let testExist = this.visualState.testShapes.length > 0
            return {
                'is-dark' : !testExist,
                'is-warning' : testExist && !this.visualState.testPassed ,
                'is-primary' : testExist && this.visualState.testPassed
            }
        },
        styleObject() {
            return {
                position: 'absolute',
                left: this.visualState.percentageInTimeline + '%',
            }
        },
        visualStateName() {
            return this.visualState.name
        }
    },
    methods: {
        draggingStartedVisualStateMark(e) {
            e.stopPropagation()
            e.preventDefault()

            let visualStateMark = e.target;
            let mouseTargetOffsetX = e.x - e.target.offsetLeft;
            let mouseTargetOffsetY = e.y - e.target.offsetTop;

            this.visualState.showAllInputEvents = true;

            let inputTimelineElement = this.$el.parentElement;
            let moveHandler = function(e) {
                e.stopPropagation();
                e.preventDefault();
                let percentageInTimeline = (e.x - mouseTargetOffsetX) * 100 / inputTimelineElement.clientWidth;
                percentageInTimeline = Math.max(Math.min(percentageInTimeline, 100), 0);

                // visualStateMark.style.left = percentageInTimeline + '%';

                let totalEventCount = globalStore.inputEvents.length - 1 //TODO We are ignoring the last event touchend because it does not have touches to show, this could also happen with touch cancel or fail in the middle of the sequence
                let index = Math.round(totalEventCount * percentageInTimeline / 100)
                index = Math.max(Math.min(index, totalEventCount - 1), 0);

                let correspondingInputEvent = globalStore.inputEvents[index]

                // console.log("% in timeline: " + percentageInTimeline + ". Total events:" + globalStore.inputEvents.length + ". index: " + index + ". Event: " + JSON.stringify(correspondingInputEvent));

                this.visualState.currentInputEvent = correspondingInputEvent;
            }.bind(this);
            window.addEventListener('mousemove', moveHandler, false);

            var upHandler
            upHandler = function(e) {
                e.stopPropagation();
                e.preventDefault();
                this.visualState.showAllInputEvents = false;
                window.removeEventListener('mousemove', moveHandler, false);
                window.removeEventListener('mouseup', upHandler, false);
            }.bind(this);
            window.addEventListener('mouseup', upHandler, false);

        }
    },
    mounted: function() {
        globalBus.$on('message-from-device-TEST_RESULT',function(data) {
            //If the deviceVisualState has the shape then we edit else we create
            // console.log("SHAPE_CREATED style: " + JSON.stringify(data.style))
            let savedShapeStatesPerEvent = data.message

            for (let eventIndexString in savedShapeStatesPerEvent) {
                let eventIndex = parseInt(eventIndexString)
                let correspondingInputEvent = globalStore.inputEvents[eventIndex]

                let createdShapeModels = []
                for (let eachShapeObjectId in savedShapeStatesPerEvent[eventIndex]) {
                    let shapeObjectData = savedShapeStatesPerEvent[eventIndex][eachShapeObjectId]

                    let aShapeModel = ShapeModel.createShape(shapeObjectData.type,shapeObjectData.id)
                    aShapeModel.fromJSON(shapeObjectData)
                    createdShapeModels.push(aShapeModel)
                }

                correspondingInputEvent.testShapes = createdShapeModels
            }
        }.bind(this));
    }
}
</script>

<style scoped>
.mark {
    width: 40px;
    height: 40px;
    position: absolute;
}
</style>