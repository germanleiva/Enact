<template>
    <div v-on:mousedown='actionStarted' :draggable="isMirror" v-on:dragstart="mirrorDragged" class='visualStateCanvas' :style="{width:visualStateModel.maxWidth+'px',height:visualStateModel.maxHeight+'px','min-width':visualStateModel.maxWidth+'px'}">
        <shape ref="shapes" v-for="aShapeModel in shapeModels" v-bind:shape-model="aShapeModel" v-bind:parent-visual-state="visualStateModel" :is-test-shape="false"></shape>
        <component ref="measures" v-for="aMeasureModel in measureModels" :is="aMeasureModel.type" :measure-model="aMeasureModel"></component>
        <input-event-mark v-for="anInputEvent in allInputEvents" v-if="visualStateModel.showAllInputEvents" :initial-input-event="anInputEvent"></input-event-mark>
        <shape v-for="aShapeModel in visualStateModel.testShapes" v-bind:shape-model="aShapeModel" v-bind:parent-visual-state="visualStateModel" :is-test-shape="true"></shape>
        <input-event-mark ref="currentInputEventMarkVM" :visual-state="visualStateModel"></input-event-mark>
    </div>
</template>

<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore, globalBus, VisualStateModel} from '../store.js'
import Shape from './Shape.vue'
import Distance from './Distance.vue'
import Point from './Point.vue'
import InputEventMark from './InputEventMark.vue'
import DiffElement from './DiffElement.vue'

export default {
    name: 'visual-state',
    props: ['visualStateModel','isMirror'],
    data: function() {
        return {
        }
    },
    components: {
        Shape,
        Distance,
        Point,
        InputEventMark,
    },
    mounted: function() {
        globalBus.$on('didSelectShapeVM', theSelectedShapeVM => {
            //A shape was selected in other VisualState, I need to deselect my shapes
            //or, I'm not in multiSelectionMode and I need to deselect my shapes (except for theSelectedShapeVM)
            if (!globalStore.toolbarState.multiSelectionMode || theSelectedShapeVM.visualState !== this.visualStateModel) {
                for (let otherSelectedShape of this.selectedShapes()) {
                    if (otherSelectedShape !== theSelectedShapeVM.shapeModel) {
                        otherSelectedShape.deselect()
                    }
                }
            }
        });
        globalBus.$on('changeColorOfSelectedShapes', selectedColor => {
            for (let aShapeModel of this.selectedShapes()) {
                //The first previousValue needs to be an actualValue
                let previousValue = aShapeModel.color;
                let newValue = selectedColor;

                //First we need to check if we are followingMaster in that property
                if (aShapeModel.isFollowingMaster('backgroundColor') && previousValue == newValue) {
                    //Don't do anything, keep following master and do not propagate
                } else {

                    aShapeModel.color = newValue;

                    if (this.nextState) {
                        this.nextState.somethingChangedPreviousState(aShapeModel.id, previousValue, newValue, 'backgroundColor');
                    }
                }
            };
        });
    },
    computed: {
        shapeModels: function() {
            let result = []
            for (let shapeKey in this.visualStateModel.shapesDictionary) {
                let shape = this.visualStateModel.shapesDictionary[shapeKey]
                if (shape) {
                    result.push(shape)
                }
            }
            return result;
        },
        measureModels: function() {
            return this.visualStateModel.measures;
        },
        currentInputEvent: {
            get: function() {
                return this.visualStateModel.currentInputEvent
            },
            set: function(newValue) {
                this.visualStateModel.currentInputEvent = newValue
            }
        },
        nextState: function() {
            return this.visualStateModel.nextState
        },
        allInputEvents: function() {
            //TODO check caching
            return globalStore.inputEvents
        }
    },
    methods: {
        measureStartedOnRelevantPoint(e,aRelevantPoint,fromEntityType,fromId) {
            e.preventDefault();
            e.stopPropagation();

            let fromHandlerName = aRelevantPoint.namePrefix;

            let sharedCachedFinalPosition = {x: e.pageX  - this.canvasOffsetLeft(), y: e.pageY  - this.canvasOffsetTop()}

            //TODO this is nasty, sorry future Germán
            let presentAndFutureMeasures = this.visualStateModel.addNewMeasureUntilLastState(fromEntityType,fromId,fromHandlerName,undefined,undefined,undefined, sharedCachedFinalPosition)
            let newMeasure = presentAndFutureMeasures[0]
            var mouseMoveHandler
            mouseMoveHandler = function(e) {
                let initial = newMeasure.initialPoint
                newMeasure.cachedFinalPosition.x =  e.pageX  - this.canvasOffsetLeft()
                newMeasure.cachedFinalPosition.y = e.pageY  - this.canvasOffsetTop()
            }.bind(this)
            let visualStateVM = this;
            let visualStateElement = visualStateVM.canvasElement();
            visualStateElement.addEventListener('mousemove', mouseMoveHandler, false);

            var mouseUpHandler
            mouseUpHandler = function(e) {
                let objectForMouseEvent = visualStateVM.handlerFor(e)
                // console.log("mouseUpHandler " + JSON.stringify(objectForMouseEvent))
                if (objectForMouseEvent) {
                    for (let eachPresentAndFutureMeasure of presentAndFutureMeasures) {
                        eachPresentAndFutureMeasure.cachedFinalPosition = undefined
                        eachPresentAndFutureMeasure.to.type = objectForMouseEvent.type
                        eachPresentAndFutureMeasure.to.id = objectForMouseEvent.id
                        eachPresentAndFutureMeasure.to.handler = objectForMouseEvent.handler
                    }
                    globalStore.socket.emit('message-from-desktop', { type: "NEW_MEASURE", message: {from: newMeasure.from ,to: newMeasure.to} })
                } else {
                    //delete measure?
                    for (let eachPresentAndFutureMeasure of presentAndFutureMeasures) {
                        eachPresentAndFutureMeasure.deleteYourself()
                    }
                }
                visualStateElement.removeEventListener('mousemove', mouseMoveHandler, false);
                visualStateElement.removeEventListener('mouseup', mouseUpHandler, false);
            }.bind(this)
            visualStateElement.addEventListener('mouseup', mouseUpHandler, false);
        },
        shapesVM() {
            if (this.$refs.hasOwnProperty('shapes')) {
                return this.$refs.shapes
            } else {
                console.log("When there are no shapes VueJS does not create the $ref :(")
                return []
            }
        },
        canvasElement() {
            return this.$el
        },
        selectedShapes: function() {
            return this.visualStateModel.selectedShapes();
        },

        handlerFor: function(mouseEvent) {
            let x = mouseEvent.pageX - this.canvasOffsetLeft()
            let y = mouseEvent.pageY - this.canvasOffsetTop()
            console.log("X: "+x+  " Y: "+y)

            for (var i = 0; i < this.$refs.shapes.length; i++) {
                let eachShapeVM = this.$refs.shapes[i];
                let result = eachShapeVM.handlerFor(x,y)

                if (result) {
                    return result
                }
            }

            for (var i = 0; i < this.$refs.measures.length; i++) {
                let eachMeasureVM = this.$refs.measures[i];
                let result = eachMeasureVM.handlerFor(x,y)

                if (result) {
                    return result
                }
            }

            if (this.$refs.currentInputEventMarkVM) {
                let result = this.$refs.currentInputEventMarkVM.handlerFor(x,y)
                if (result) {
                    return result
                }
            }

            return undefined
        },
        mirrorDragged(event) {
            console.log("Started dragging mirror mobile");
            event.dataTransfer.setData("text/visual-state", "");
        },
        actionStarted: function(e) {
            if (this.isMirror) {
                return
            }
            e.preventDefault()
            if (globalStore.toolbarState.drawMode) {
                this.drawingStarted(e);
            } else if (globalStore.toolbarState.selectionMode) {
                let selectedShape = null;

                //We traverse the shapes in backward order
                let allShapes = this.shapesVM()
                for (var i = allShapes.length - 1; i >= 0; i--) {
                    var each = allShapes[i];
                    let x = e.x - this.canvasElement().offsetLeft;
                    let y = e.y - this.canvasElement().offsetTop;
                    if (each.shapeModel.isPointInside(x, y)) {
                        each.toggleSelection();

                        if (each.isSelected) {
                            selectedShape = each;
                        }
                        continue;
                    }
                }

                if (!globalStore.toolbarState.multiSelectionMode) {
                    for (let previouslySelectedShape of this.selectedShapes()) {
                        if (!selectedShape || previouslySelectedShape !== selectedShape) {
                            previouslySelectedShape.deselect();
                        }
                    };
                }

            }
        },

        //DRAWING METHODS
        drawingStarted: function(e) {
            globalStore.deselectAllShapes()

            var newShapeModel = this.visualStateModel.addNewShape();
            if (this.nextState) {
                this.nextState.didCreateShape(newShapeModel, this.visualStateModel);
            }
            let startingWindowMousePosition = {
                x: e.pageX + document.getElementById('outputArea').scrollLeft,
                y: e.pageY + document.getElementById('outputArea').scrollTop
            };

            this.updateShapeProperties(e,newShapeModel,startingWindowMousePosition)

            var mouseMoveHandler

            mouseMoveHandler = function(e) {
                e.preventDefault()
                newShapeModel.isResizing = true;
                this.drawingChanged(e, newShapeModel, startingWindowMousePosition)
            }.bind(this)

            var mouseUpHandler
            mouseUpHandler = function(e) {
                e.preventDefault()
                newShapeModel.isResizing = false;
                this.drawingEnded(e, newShapeModel)
                window.removeEventListener('mousemove', mouseMoveHandler, false);
                window.removeEventListener('mouseup', mouseUpHandler, false);
            }.bind(this)

            window.addEventListener('mousemove', mouseMoveHandler, false);
            window.addEventListener('mouseup', mouseUpHandler, false);

            if (globalStore.visualStates[0] === this.visualStateModel) {
                // let visualStateCanvasHTML = this.$el.getElementsByClassName("visualStateCanvas")[0].innerHTML;
                // globalStore.socket.emit('message-from-desktop', { type: "NEW_SHAPE", message: visualStateCanvasHTML })
                globalStore.socket.emit('message-from-desktop', { type: "NEW_SHAPE", message: { id: newShapeModel.id, color: newShapeModel.color, width: newShapeModel.width, height: newShapeModel.height, top: newShapeModel.top, left: newShapeModel.left, opacity: newShapeModel.opacity } })
            }
        },

        drawingChanged: function(e, newShapeModel, startingWindowMousePosition) {
            this.updateShapeProperties(e, newShapeModel, startingWindowMousePosition);
        },

        drawingEnded: function(e, newShapeModel) {
            // if (this.nextState) {
            //     this.nextState.didCreateShape(newShapeModel, this.visualStateModel);
            // }
            //TODO repeated code with Toolbar >> selectionSelected, we should use globalBus
            globalStore.toolbarState.drawMode = false;
            globalStore.toolbarState.selectionMode = true;
            globalStore.toolbarState.measureMode = false;

            newShapeModel.isSelected = true;
        },

        updateShapeProperties: function(e, newShapeModel, startingWindowMousePosition) {
            //Maybe this should go in Shape
            let currentWindowMousePositionX = e.pageX + document.getElementById('outputArea').scrollLeft;
            let currentWindowMousePositionY = e.pageY + document.getElementById('outputArea').scrollTop;
            var topValue = startingWindowMousePosition.y
            if (currentWindowMousePositionY < startingWindowMousePosition.y) {
                topValue = currentWindowMousePositionY;
            }

            var leftValue = startingWindowMousePosition.x
            if (currentWindowMousePositionX < startingWindowMousePosition.x) {
                leftValue = currentWindowMousePositionX;
            }
            var widthValue = Math.abs(currentWindowMousePositionX - startingWindowMousePosition.x);
            var heightValue = Math.abs(currentWindowMousePositionY - startingWindowMousePosition.y)

            newShapeModel.top = topValue - this.canvasOffsetTop();
            newShapeModel.left = leftValue - this.canvasOffsetLeft();
            newShapeModel.width = widthValue;
            newShapeModel.height = heightValue;
        },
        canvasOffsetLeft() {
            return this.canvasElement().offsetLeft;
        },
        canvasOffsetTop() {
            return this.canvasElement().offsetTop;
        }
    }
}
</script>