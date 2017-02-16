<template>
    <div class='visualStateContainer'>
        <div v-on:mousedown='actionStarted' class='visualStateCanvas' :style="{width:visualStateModel.maxWidth+'px',height:visualStateModel.maxHeight+'px','min-width':visualStateModel.maxWidth+'px'}">
            <shape  ref="shapes" v-for="aShapeModel in shapeModels" v-bind:shape-model-id="aShapeModel.id" v-bind:parent-visual-state="visualStateModel"></shape>
            <input-event-mark v-for="anInputEvent in allInputEvents" v-if="visualStateModel.showAllInputEvents" :initial-input-event="anInputEvent"></input-event-mark>
            <input-event-mark v-bind:initial-visual-state="visualStateModel"></input-event-mark>
        </div>
        <div class="diffContainer">
            <a class='button visualStateDiff' :class="{ 'is-disabled' : nextState === undefined}" @click='displayDiff'><span class="icon is-small"><i class="fa fa-exchange"></i></span></a>
            <div v-show='isDisplayingDiff' class='diffBox'>
                <div>
                    <div class='box' v-for="(diffArray,touchIndex) in inputDifferencesWithNextState">
                        {{'F'+touchIndex}}<diff-element v-for="diff in diffArray" :diff-data="diff"></diff-element>
                    </div>
                </div>
                <div>
                    <div class='box' v-for="(diffArray,shapeKey) in outputDifferencesWithNextState">
                        {{shapeKey}}<diff-element v-for="diff in diffArray" :diff-data="diff"></diff-element>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>

import {globalStore, globalBus} from '../store.js'
import Shape from './Shape.vue'
import InputEventMark from './InputEventMark.vue'
import DiffElement from './DiffElement.vue'

export default {
    name: 'visual-state',
    props: ['initialVisualStateModel'],
    data: function() {
        // return {
        //     currentInputEvent: undefined,
        //     shapesDictionary: {},
        //     nextState: undefined,
        //     previousState: undefined,
        //     isDisplayingDiff: false,
        //     showAllInputEvents: false,
        // }
        return {
            visualStateModel: this.initialVisualStateModel,
            isDisplayingDiff: false,
            // showAllInputEvents: false
        }
    },
    components: {
        Shape,
        InputEventMark,
        DiffElement,
    },
    mounted: function() {
        globalBus.$on('didSelectShapeVM', theSelectedShapeVM => {
            //A shape was selected in other VisualState, I need to deselect my shapes
            //or, I'm not in multiSelectionMode and I need to deselect my shapes (except for theSelectedShapeVM)
            if (!globalStore.toolbarState.multiSelectionMode || theSelectedShapeVM.visualState !== this.visualStateModel) {
                for (let otherSelectedShapeVM of this.selectedShapes()) {
                        if (otherSelectedShapeVM !== theSelectedShapeVM) {
                            otherSelectedShapeVM.deselect()
                        }
                    }
            }
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
        previousState: function() {
            return this.visualStateModel.previousState
        },
        allInputEvents: function() {
            //TODO check caching
            return globalStore.inputEvents
        },
        inputDifferencesWithNextState: {
            cache: false,
            get: function() {
                let result = {}

                let atIfNone = function(key,ifNoneValue) {
                    if (!result[key]) {
                        result[key] = ifNoneValue
                    }
                    return result[key]
                }

                if (this.hasNextState) {

                    if (this.currentInputEvent) {
                        if (this.nextState.currentInputEvent) {
                            //Both states have an input event
                            if (this.currentInputEvent.touches.length != this.nextState.currentInputEvent.touches.length) {
                                //TODO there's a difference that needs to be informed
                                console.log("another WERID!!!!!")
                            } else {
                                for (let i = 0; i < this.currentInputEvent.touches.length; i++) {
                                    if (this.currentInputEvent.touches[i].x != this.nextState.currentInputEvent.touches[i].x || this.currentInputEvent.touches[i].y != this.nextState.currentInputEvent.touches[i].y) {

                                        atIfNone(i,[]).push({id: i, isInput: true, translation: { previousValue: { x: this.currentInputEvent.touches[i].x, y: this.currentInputEvent.touches[i].y }, newValue: { x: this.nextState.currentInputEvent.touches[i].x, y: this.nextState.currentInputEvent.touches[i].y } } })
                                    }
                                }
                            }
                        } else {
                            //The next state removed the input event or didn't set one
                            for (let eachTouch in this.currentInputEvent.touches) {
                                let i = this.currentInputEvent.touches.indexOf(eachTouch)

                                atIfNone(i,[]).push({id: i, isInput: true, removed: { previousValue: this.currentInputEvent, newValue: this.nextState.currentInputEvent } })
                            }

                        }
                    } else {
                        if (this.nextState.currentInputEvent) {
                            //The next state added an input event and I don't have one

                            for (let eachTouch in this.nextState.currentInputEvent.touches) {
                                let i = this.nextState.currentInputEvent.touches.indexOf(eachTouch)

                                atIfNone(i,[]).push({id: i, isInput: true, added: { previousValue: this.currentInputEvent, newValue: this.nextState.currentInputEvent }} );
                            }

                        } else {
                            //Both states don't have an input event
                        }
                    }
                }
                return result
            }
        },
        outputDifferencesWithNextState: {
            cache: false,
            get: function() {
                let result = {}

                let atIfNone = function(key,ifNoneValue) {
                    if (!result[key]) {
                        result[key] = ifNoneValue
                    }
                    return result[key]
                }

                if (this.hasNextState) {
                    let comparedShapesKey = []
                    for (let shapeKey in this.visualStateModel.shapesDictionary) {
                        comparedShapesKey.push(shapeKey)
                        let aShape = this.visualStateModel.shapesDictionary[shapeKey];
                        let comparingShape = this.nextState.shapeFor(shapeKey)
                        if (comparingShape) {
                            for (let eachDiff of aShape.diffArray(comparingShape)) {
                                atIfNone(shapeKey,[]).push(eachDiff);
                            }
                        } else {
                            // result.push('Removed Shape ' + aShape.id)
                            atIfNone(shapeKey,[]).push({id: shapeKey, removed: { previousValue: undefined, newValue: aShape.id } })
                        }
                    }
                    for (let nextShapeKey in this.nextState.shapesDictionary) {
                        if (comparedShapesKey.indexOf(nextShapeKey) < 0) {
                            //key not found
                            // result.push('Added Shape ' + nextShapeKey)
                            atIfNone(nextShapeKey,[]).push({id: nextShapeKey, added: { previousValue: undefined, newValue: nextShapeKey } })
                        }
                    }
                }
                return result
            }
        },

        hasNextState() {
            return this.nextState !== undefined;
        }
    },
    methods: {
        shapesVM() {
            if (this.$refs.hasOwnProperty('shapes')) {
                return this.$refs.shapes
            } else {
                console.log("why does this happen?")
                return []
            }
        },
        displayDiff() {
            this.isDisplayingDiff = !this.isDisplayingDiff;
        },
        canvasElement() {
            return this.$el.getElementsByClassName("visualStateCanvas")[0]
        },
        selectedShapes: function() {
            return this.shapesVM().filter(each => each.isSelected);
        },
        actionStarted: function(e) {
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
                    if (each.shapeModel().isPointInside(x, y)) {
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
            var newShapeModel = this.visualStateModel.addNewShape();
            if (this.nextState) {
                this.nextState.didCreateShape(newShapeModel, this.visualStateModel);
            }
            let startingWindowMousePosition = {
                x: e.pageX + document.getElementById('outputArea').scrollLeft,
                y: e.pageY + document.getElementById('outputArea').scrollTop
            };

            var mouseMoveHandler

            mouseMoveHandler = function(e) {
                e.preventDefault()
                this.drawingChanged(e, newShapeModel, startingWindowMousePosition)
            }.bind(this)

            var mouseUpHandler
            mouseUpHandler = function(e) {
                e.preventDefault()
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

        changeColorOnSelection: function(cssStyle) {
            for (let selectedShapeVM of this.selectedShapes()) {
                //The first previousValue needs to be an actualValue
                let previousValue = selectedShapeVM.shapeModel().color;
                let newValue = cssStyle['background-color'];

                //First we need to check if we are followingMaster in that property
                if (selectedShapeVM.shapeModel().isFollowingMaster('backgroundColor') && previousValue == newValue) {
                    //Don't do anything, keep following master and do not propagate
                } else {

                    selectedShapeVM.shapeModel().color = newValue;

                    if (this.nextState) {
                        this.nextState.somethingChangedPreviousState(selectedShapeVM.shapeModel().id, previousValue, newValue, 'backgroundColor');
                    }
                }
            };
        },
        moveSelectedShapes(deltaX,deltaY) {
            for (let eachSelectedShape of this.selectedShapes()) {
                eachSelectedShape.shapeModel().left += deltaX
                eachSelectedShape.shapeModel().top += deltaY
            }
        },
        deleteSelectedShapes() {
            for (let shapeVMToDelete of this.selectedShapes()) {
                this.visualStateModel.deleteShape(shapeVMToDelete.shapeModel())
            }
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