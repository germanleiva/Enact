<template>
    <div class='visualStateContainer'>
        <div v-on:mousedown='actionStarted' class='visualStateCanvas' :style="{width:visualStateModel.maxWidth+'px',height:visualStateModel.maxHeight+'px','min-width':visualStateModel.maxWidth+'px'}">
            <shape ref="shapes" v-for="aShapeModel in shapeModels" v-bind:shape-model="aShapeModel" v-bind:parent-visual-state="visualStateModel"></shape>
            <component ref="measures" v-for="aMeasureModel in measureModels" :is="aMeasureModel.type" :measure-model="aMeasureModel"></component>
            <input-event-mark v-for="anInputEvent in allInputEvents" v-if="visualStateModel.showAllInputEvents" :initial-input-event="anInputEvent"></input-event-mark>
            <!-- <input-event-mark v-for="anInputEvent in allInputEvents" v-if="true" :initial-input-event="anInputEvent"></input-event-mark> -->
            <input-event-mark :visual-state="visualStateModel"></input-event-mark>
        </div>
        <div class="diffContainer" @drop="dropMirrorMobile" @dragover="allowDropMirrorMobile">
            <a class='button visualStateDiff' :class="{ 'is-disabled' : nextState === undefined}" @click='displayDiff'><span class="icon is-small"><i class="fa fa-exchange"></i></span></a>
            <div v-show='isDisplayingDiff' class='diffBox'>
                <div>
                    <div class='box' v-for="(diffArray,touchIndex) in inputDifferencesWithNextState">
                        <div v-if="diffArray.length > 0">
                            {{'F'+touchIndex}}
                            <diff-element v-for="diff in diffArray" :diff-data="diff"></diff-element>
                        </div>
                    </div>
                </div>
                <div>
                    <div class='box' v-for="(diffArray,shapeKey) in outputDifferencesWithNextState">
                        <div v-if="diffArray.length > 0">
                            {{shapeKey}}
                            <diff-element v-for="diff in diffArray" :diff-data="diff"></diff-element>
                        </div>
                    </div>
                </div>
                <div>
                    <div class='box' v-for="(diffArray,measureKey) in measuresDifferencesWithNextState">
                        <div v-if="diffArray.length > 0">
                            {{measureKey}}
                            <diff-element v-for="diff in diffArray" :diff-data="diff"></diff-element>
                        </div>
                    </div>
                </div>
            </div>
        </div>
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
    props: ['visualStateModel'],
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
            isDisplayingDiff: false,
            // showAllInputEvents: false
        }
    },
    components: {
        Shape,
        Distance,
        Point,
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
        previousState: function() {
            return this.visualStateModel.previousState
        },
        allInputEvents: function() {
            //TODO check caching
            return globalStore.inputEvents
        },
        inputDifferencesWithNextState: function() {
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

                                    atIfNone(i,[]).push({id: i, type: 'input', property: { name: "translation" , before: { x: this.currentInputEvent.touches[i].x, y: this.currentInputEvent.touches[i].y }, after: { x: this.nextState.currentInputEvent.touches[i].x, y: this.nextState.currentInputEvent.touches[i].y } } })
                                }
                            }
                        }
                    } else {
                        //The next state removed the input event or didn't set one
                        for (let eachTouch in this.currentInputEvent.touches) {
                            let i = this.currentInputEvent.touches.indexOf(eachTouch)

                            atIfNone(i,[]).push({id: i, type: 'input', property: { name: "removed", before: this.currentInputEvent, after: this.nextState.currentInputEvent } })
                        }

                    }
                } else {
                    if (this.nextState.currentInputEvent) {
                        //The next state added an input event and I don't have one

                        for (let eachTouch in this.nextState.currentInputEvent.touches) {
                            let i = this.nextState.currentInputEvent.touches.indexOf(eachTouch)

                            atIfNone(i,[]).push({id: i, type: 'input', property: { name:"added" , before: this.currentInputEvent, after: this.nextState.currentInputEvent }} );
                        }

                    } else {
                        //Both states don't have an input event
                    }
                }
            }
            return result
        },
        measuresDifferencesWithNextState: function() {
            let result = {}

            let atIfNone = function(key,ifNoneValue) {
                if (!result[key]) {
                    result[key] = ifNoneValue
                }
                return result[key]
            }

            if (this.hasNextState) {
                let comparedMeasuresKey = []
                for (let aMeasure of this.visualStateModel.measures) {
                    let aMeasureKey = aMeasure.id
                    comparedMeasuresKey.push(aMeasureKey)
                    let comparingMeasure = this.nextState.measureFor(aMeasure)
                    if (comparingMeasure) {
                        for (let eachDiff of aMeasure.diffArray(comparingMeasure)) {
                            atIfNone(aMeasureKey,[]).push(eachDiff);
                        }
                    } //else {
                        //There's no point in showing the deleted measures
                        // atIfNone(aMeasureKey,[]).push({id: aMeasureKey, type: 'measure', removed: { previousValue: undefined, newValue: aMeasureKey } })
                    // }
                }

                //There's no point in showing the added measures
                // for (let nextMeasure of this.nextState.measures) {
                //     let nextMeasureKey = nextMeasure.id
                //     if (comparedMeasuresKey.indexOf(nextMeasureKey) < 0) {
                //         //key not found
                //         // result.push('Added Shape ' + nextShapeKey)
                //         atIfNone(nextMeasureKey,[]).push({id: nextMeasureKey, type: 'measure', added: { previousValue: undefined, newValue: nextMeasureKey } })
                //     }
                // }
            }
            return result
        },
        outputDifferencesWithNextState() {
            console.log("VisualState >> outputDifferencesWithNextState")

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
                        atIfNone(shapeKey,[]).push({id: shapeKey,type: 'output', property: {name: "removed", before: undefined, after: aShape.id } })
                    }
                }
                for (let nextShapeKey in this.nextState.shapesDictionary) {
                    if (comparedShapesKey.indexOf(nextShapeKey) < 0) {
                        //key not found
                        // result.push('Added Shape ' + nextShapeKey)
                        atIfNone(nextShapeKey,[]).push({id: nextShapeKey,type: 'output', property: { name: "added", before: undefined, after: nextShapeKey } })
                    }
                }
            }
            return result
        },
        hasNextState() {
            return this.nextState !== undefined;
        }
    },
    methods: {
        dropMirrorMobile(event) {
            event.preventDefault();
            console.log("dropMirrorMobile")

            //TODO AWFUL!!!
            let currentDeviceVisualState = this.$root.$children[0].deviceVisualState

            globalStore.insertVisualStateAfter(currentDeviceVisualState.shapesDictionary,this.visualStateModel)
        },
        allowDropMirrorMobile(event) {
            var dataType = event.dataTransfer.types;
            console.log("allowDropMirrorMobile >> " + dataType)
            if (dataType == "text/visual-state") {
                event.preventDefault()
            }
        },
        measureStartedOnRelevantPoint(e,aRelevantPoint,fromEntityType,fromId) {
            e.preventDefault();
            e.stopPropagation();

            let fromHandlerName = aRelevantPoint.namePrefix;

            let sharedCachedFinalPosition = {x: e.pageX  - this.canvasOffsetLeft(), y: e.pageY  - this.canvasOffsetTop()}

            //TODO this is nasty, sorry future Germán
            let presentAndFutureMeasures = this.initialVisualStateModel.addNewMeasureUntilLastState(fromEntityType,fromId,fromHandlerName,undefined,undefined,undefined, sharedCachedFinalPosition)
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
                console.log("mouseUpHandler " + JSON.stringify(objectForMouseEvent))
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
        displayDiff() {
            this.isDisplayingDiff = !this.isDisplayingDiff;
        },
        canvasElement() {
            return this.$el.getElementsByClassName("visualStateCanvas")[0]
        },
        selectedShapes: function() {
            return this.shapesVM().filter(each => each.shapeModel.isSelected);
        },

        handlerFor: function(mouseEvent) {
            let x = mouseEvent.pageX - this.canvasOffsetLeft()
            let y = mouseEvent.pageY - this.canvasOffsetTop()
            console.log("X: "+x+  " Y: "+y)

            for (let eachShapeVM of this.$refs.shapes) {
                let result = eachShapeVM.handlerFor(x,y)

                if (result) {
                    return result
                }
            }

            for (let eachMeasureVM of this.$refs.measures) {
                let result = eachMeasureVM.handlerFor(x,y)

                if (result) {
                    return result
                }
            }
            return undefined
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
                let previousValue = selectedShapeVM.shapeModel.color;
                let newValue = cssStyle['background-color'];

                //First we need to check if we are followingMaster in that property
                if (selectedShapeVM.shapeModel.isFollowingMaster('backgroundColor') && previousValue == newValue) {
                    //Don't do anything, keep following master and do not propagate
                } else {

                    selectedShapeVM.shapeModel.color = newValue;

                    if (this.nextState) {
                        this.nextState.somethingChangedPreviousState(selectedShapeVM.shapeModel.id, previousValue, newValue, 'backgroundColor');
                    }
                }
            };
        },
        moveSelectedShapes(deltaX,deltaY) {
            for (let eachSelectedShape of this.selectedShapes()) {
                eachSelectedShape.shapeModel.left += deltaX
                eachSelectedShape.shapeModel.top += deltaY
            }
        },
        deleteSelectedShapes() {
            for (let shapeVMToDelete of this.selectedShapes()) {
                this.visualStateModel.deleteShape(shapeVMToDelete.shapeModel)
            }
        },
        canvasOffsetLeft() {
            return this.canvasElement().offsetLeft;
        },
        canvasOffsetTop() {
            return this.canvasElement().offsetTop;
        },
        didMouseOver(diffElementVM) {
            this.highlightInvolvedElement(diffElementVM,true)
        },
        didMouseOut(diffElementVM) {
            this.highlightInvolvedElement(diffElementVM,false)
        },
        highlightInvolvedElement(diffElementVM,aBoolean){
            let data = diffElementVM.diffData

            this.visualStateModel.toggleHighlightForInvolvedElement(data.id,aBoolean)
        }
    }
}
</script>