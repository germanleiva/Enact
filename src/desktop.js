import Vue from 'vue'
import io from 'socket.io-client';
// import App from './App.vue'

require('bulma/css/bulma.css')
require('font-awesome/css/font-awesome.css')
require('./desktop.css')

// import store from './store.js'

// let socket = io.connect('http://localhost:3000');
let context = undefined

export const globalStore = new Vue({
    data: {
        visualStates: [],
        inputEvents: [],
        isRecording: false,
        shapeCounter: 0,
        toolbarState: {
            drawMode: false,
            selectionMode: true,
            multiSelectionMode: false,
            currentColor: '#1a60f3'
        },
        cursorType: 'auto',
        context: undefined
    },
    computed: {
        socket() {
            //TODO check if putting this as a computed property is legit
            return io.connect('http://localhost:3000')
        }
    }
})

let timelineAreaVM = new Vue({
    el: '#timelineArea',
    data: {

    },
    computed: {
        visualStates: function() {
            return globalStore.visualStates
        },
        isRecording: {
            get: function() {
                return globalStore.isRecording
            },
            set: function(newValue) {
                globalStore.isRecording = newValue
            }
        }
    },
    methods: {
        toggleRecording() {
            this.isRecording = !this.isRecording;
            if (this.isRecording) {
                globalStore.socket.emit('message-from-desktop', { type: "START_RECORDING", message: undefined })
            }
        },
        startPlaying() {
            let animation = {}

            let hiddedShapesKeys = []
            for (let eachShapeKey = 0; eachShapeKey < globalStore.shapeCounter; eachShapeKey++) {
                let shapeKeyframes = {}
                animation['shape' + eachShapeKey] = shapeKeyframes

                let createKeyframe = function(aVisualState, currentPercentage) {
                    let currentInputEventIndex = globalStore.inputEvents.indexOf(aVisualState.currentInputEvent)
                    if (currentPercentage == undefined) {
                        currentPercentage = Math.max(Math.floor(currentInputEventIndex * 100 / globalStore.inputEvents.length), 0);
                    }
                    let shapeInThisVisualState = aVisualState.shapeFor(eachShapeKey)
                    if (shapeInThisVisualState) {
                        shapeKeyframes[currentPercentage + '%'] = shapeInThisVisualState.$el.style.cssText;
                    } else {
                        if (currentPercentage == 0 || currentPercentage == 100) {
                            if (hiddedShapesKeys.indexOf(eachShapeKey) < 0) {
                                hiddedShapesKeys.push(eachShapeKey)
                            }
                            //We need to find in which visual state this shape first appeared, get the attributes and hide
                            for (let eachOtherVS of globalStore.visualStates) {
                                let missingShape = eachOtherVS.shapesDictionary[eachShapeKey]
                                if (missingShape) {
                                    var re = /opacity:?\s(\w+);/;

                                    shapeKeyframes[currentPercentage + '%'] = missingShape.$el.style.cssText.replace(re, 'opacity:0;');

                                    break;
                                }
                            }
                        }

                    }
                }
                for (let eachVisualState of globalStore.visualStates) {
                    createKeyframe(eachVisualState)
                }

                if (!shapeKeyframes['0%']) {
                    createKeyframe(globalStore.visualStates.first(), 0)
                }

                if (!shapeKeyframes['100%']) {
                    createKeyframe(globalStore.visualStates.last(), 100)
                }
            }

            globalStore.socket.emit('message-from-desktop', { type: "NEW_ANIMATION", message: animation })
        }
    }
});

Vue.component('visual-state-mark', {
    props: ['initialVisualState'],
    data: function() {
        return { visualState: this.initialVisualState }
    },
    template: `<div class="mark button is-dark" :style="styleObject" v-on:mousedown="draggingStartedVisualStateMark"><slot></slot></div>`,
    computed: {
        styleObject() {
            return {
                left: this.percentageInTimeline + '%'
            }
        },
        percentageInTimeline() {
            if (this.visualState.currentInputEvent) {
                let totalEventCount = globalStore.inputEvents.length
                let index = globalStore.inputEvents.indexOf(this.visualState.currentInputEvent)

                return index * 100 / totalEventCount;
            } else {
                return 0;
            }
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

                let totalEventCount = globalStore.inputEvents.length
                let index = Math.round(totalEventCount * percentageInTimeline / 100)
                index = Math.max(Math.min(index, totalEventCount - 1), 0);

                let correspondingInputEvent = globalStore.inputEvents[index]

                // console.log("% in timeline: " + percentageInTimeline + ". Total events:" + totalEventCount + ". index: " + index + ". Event: " + JSON.stringify(correspondingInputEvent));

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
    }
});

if (!Array.prototype.first) {
    Array.prototype.first = function() {
        return this[0];
    }
}
if (!Array.prototype.last) {
    Array.prototype.last = function() {
        return this[this.length - 1];
    }
}
if (!Array.prototype.removeAll) {
    Array.prototype.removeAll = function() {
        return this.splice(0, this.length);
    }
}

window.addEventListener('keydown', function(e) {
    if (e.code === 'AltLeft' || e.code === 'AltRight') {
        globalStore.toolbarState.multiSelectionMode = true;
    }
});
window.addEventListener('keyup', function(e) {
    globalStore.toolbarState.multiSelectionMode = false;
});

let isLoggerActive = false;
let logger = function(text) {
    if (isLoggerActive) {
        console.log(text);
    }
}

class VisualStateModel {
    constructor() {
        this.shapesDictionary = {}
        this.currentInputEvent = undefined
        this.nextState = undefined
        this.previousState = undefined
        this.maxWidth = 375
        this.maxHeight = 667
        this.showAllInputEvents = false
    }
    shapes() {
        let result = [];
        for (let shapeModelId in this.shapesDictionary) {
            result.push(this.shapesDictionary[shapeModelId]);
        }
        return result;
    }
    addNewShape(protoShape) {
        let correspondingVersion

        if (protoShape) {
            //Cheap way of cloning the version
            correspondingVersion = new ShapeModelVersion(protoShape.model, protoShape);
        } else {
            let newId = globalStore.shapeCounter++;
            correspondingVersion = new ShapeModelVersion(new ShapeModel(newId), undefined, 'white', 0, 0, 0, 0);
        }

        // if (oldShapeVM) {
        //     newShapeVM.isSelected = oldShapeVM.isSelected
        // }
        // var newShapeVM = new ShapeVM({ data: { visualState: this, version: correspondingVersion } });

        // newShapeVM.$mount();
        // this.canvasElement().appendChild(newShapeVM.$el);
        // Vue.set(this.shapesDictionary, newShapeVM.version.model.id, newShapeVM);
        Vue.set(this.shapesDictionary, correspondingVersion.model.id, correspondingVersion);

        return correspondingVersion;
    }
    didCreateShape(newlyCreatedShape, previousState) {
        if (this.previousState !== previousState) {
            console.log("WARNING: THIS SHOULDN'T HAPPEN");
        }

        let ourNewlyCreatedShape = this.addNewShape(newlyCreatedShape);
        if (this.nextState) {
            this.nextState.didCreateShape(ourNewlyCreatedShape, this);
        }
    }
    shapeFor(aShapeKey) {
        return this.shapesDictionary[aShapeKey];
    }
    somethingChangedPreviousState(model, previousValue, changedValue, changedPropertyName) {
        let relatedShape = this.shapesDictionary[model.id]
        if (!relatedShape) {
            return;
        }
        let newPreviousValue = previousValue;

        if (!relatedShape.isFollowingMaster(changedPropertyName)) {
            newPreviousValue = relatedShape.valueForProperty(changedPropertyName);
            // newPreviousValue = relatedShape.version.nonZeroValue(changedPropertyName);
        }

        if (relatedShape.areEqualValues(changedPropertyName, newPreviousValue, previousValue)) {
            //Equal values, this shape should keep or start following the master
            relatedShape.followMaster(changedPropertyName);

            if (this.nextState) {
                this.nextState.somethingChangedPreviousState(model, newPreviousValue, changedValue, changedPropertyName);
            }
        } else {
            logger("newPreviousValue is NOT equal to previousValue")

            //Shape is getting it s own value, so its not following the materVersion anymore
            if (relatedShape.isFollowingMaster(changedPropertyName)) {
                relatedShape[changedPropertyName].value = changedValue
            }
        }
    }
}

class ShapeModel {
    constructor(anId) {
        this.id = anId;
    }
}

class ShapeModelVersion {
    constructor(model, aMasterVersion, aColor = '', left = null, top = null, width = null, height = null) {
        this.model = model;

        this.opacity = 1

        this.backgroundColor = {
            value: aColor
        };
        this.translation = {
            value: {
                x: left,
                y: top
            }
        };
        this.scaling = {
            value: {
                w: width,
                h: height
            }
        };
        this.masterVersion = aMasterVersion;
    }
    get left() {
        if (this.translation.value.x == null) {
            return this.masterVersion.left;
        }
        return this.translation.value.x;
    }
    get top() {
        if (this.translation.value.y == null) {
            return this.masterVersion.top;
        }
        return this.translation.value.y;
    }
    get width() {
        if (this.scaling.value.w == null) {
            return this.masterVersion.width;
        }
        return this.scaling.value.w;
    }
    get height() {
        if (this.scaling.value.h == null) {
            return this.masterVersion.height;
        }
        return this.scaling.value.h;
    }
    get color() {
        if (this.backgroundColor.value == '') {
            return this.masterVersion.color;
        }
        return this.backgroundColor.value;
    }
    set top(value) {
        this.translation.value.y = value;
    }
    set left(value) {
        this.translation.value.x = value;
    }
    set width(value) {
        this.scaling.value.w = value;
    }
    set height(value) {
        this.scaling.value.h = value;
    }
    get position() {
        if (this.isFollowingMaster('translation')) {
            return this.masterVersion.position;
        }
        return this.translation.value;
    }
    get scale() {
        if (this.isFollowingMaster('scaling')) {
            return this.masterVersion.scale;
        }
        return this.scaling.value;
    }
    set color(value) {
        this.backgroundColor.value = value;
    }
    followMaster(property) {
        switch (property) {
            case 'backgroundColor':
                this.backgroundColor.value = '';
                break;
            case 'translation':
                this.translation.value.x = null;
                this.translation.value.y = null;
                break;
            case 'scaling':
                this.scaling.value.w = null;
                this.scaling.value.h = null;
                break;
        }
    }
    isFollowingMaster(property) {
        switch (property) {
            case 'backgroundColor':
                return this.backgroundColor.value == '';
            case 'translation':
                return this.translation.value.x == null && this.translation.value.y == null;
            case 'scaling':
                return this.scaling.value.w == null && this.scaling.value.h == null;
        }
    }
    nonZeroValue(property) {
        switch (property) {
            case 'backgroundColor':
                return this.color;
            case 'translation':
                return this.position;
            case 'scaling':
                return this.scale;
        }
    }
    valueForProperty(property) {
        return this[property].value;
    }
    areEqualValues(property, value1, value2) {
        switch (property) {
            case 'backgroundColor':
                return value1 == value2;
            case 'translation':
                return value1.x == value2.x && value1.y == value2.y;
            case 'scaling':
                return value1.w == value2.w && value1.h == value2.h;
        }
    }
    isPointInside(x, y) {
        return this.top < y && this.left < x && x < this.left + this.width && y < this.top + this.height;
    }
    diffArray(nextShapeWithTheSameModel) {
        let changes = []
        if (!nextShapeWithTheSameModel.isFollowingMaster('backgroundColor')) {
            // changes.push('Changed color from ' + this.color + ' to ' + nextShapeWithTheSameModel.color)
            changes.push({ backgroundColor: { previousValue: this.color, newValue: nextShapeWithTheSameModel.color } })
        }
        if (!nextShapeWithTheSameModel.isFollowingMaster('translation')) {
            // changes.push('Changed position from ' + JSON.stringify(this.position) + ' to ' + JSON.stringify(nextShapeWithTheSameModel.position))
            changes.push({ translation: { previousValue: this.position, newValue: nextShapeWithTheSameModel.position } })
        }
        if (!nextShapeWithTheSameModel.isFollowingMaster('scaling')) {
            // changes.push('Changed size from ' + JSON.stringify(this.scale) + ' to ' + JSON.stringify(nextShapeWithTheSameModel.scale))
            changes.push({ scaling: { previousValue: this.scale, newValue: nextShapeWithTheSameModel.scale } })
        }
        return changes
    }
}

Vue.component('input-event-mark', {
    props: ['initialVisualState', 'initialInputEvent'],
    template: `<div v-if="inputEvent !== undefined"><div v-for="touch in inputEvent.touches" :style="styleObject(touch)" v-on:mousedown="draggedInputEventMark"></div></div>`,
    data: function() {
        return { visualState: this.initialVisualState }
    },
    computed: {
        inputEvent() {
            if (this.visualState) {
                return this.visualState.currentInputEvent
            }
            return this.initialInputEvent
        }
    },
    methods: {
        draggedInputEventMark(e) {
            let mouseMoveHandler;

            let startingMousePositionX = e.x;

            let initialIndex = globalStore.inputEvents.indexOf(this.inputEvent);
            mouseMoveHandler = function(e) {
                let deltaX = e.x - startingMousePositionX
                let indexVariation = Math.floor(deltaX / 2);
                let newIndex = Math.max(Math.min(initialIndex + indexVariation, globalStore.inputEvents.length - 1), 0);
                this.visualState.currentInputEvent = globalStore.inputEvents[newIndex];
                this.visualState.showAllInputEvents = true;
            }.bind(this)

            let mouseUpHandler;
            mouseUpHandler = function(e) {
                this.visualState.showAllInputEvents = false;
                window.removeEventListener('mousemove', mouseMoveHandler, false);
                window.removeEventListener('mouseup', mouseUpHandler, false);
            }.bind(this)

            window.addEventListener('mousemove', mouseMoveHandler, false);
            window.addEventListener('mouseup', mouseUpHandler, false);
        },
        styleObject(aTouch) {
            return {
                borderRadius: '15px',
                position: 'absolute',
                left: aTouch.x + 'px',
                top: aTouch.y + 'px',
                width: '30px',
                height: '30px',
                backgroundColor: this.visualState ? 'red' : 'pink',
                'z-index': 9999
            };
        }
    }

})

Vue.component('diff-element', {
    props: ['diffData'],
    template: `"<a class='button' :style="styleObject"><i class='fa' v-bind:class="classObject"></i></a>"`,
    data: function() {
        return {}
    },
    computed: {
        classObject: {
            cache: false,
            get: function() {
                return {
                    'fa-arrows-h': this.diffData['translation'] != undefined && (this.diffData['translation'].previousValue.x != this.diffData['translation'].newValue.x) && (this.diffData['translation'].previousValue.y == this.diffData['translation'].newValue.y),
                    'fa-arrows-v': this.diffData['translation'] != undefined && (this.diffData['translation'].previousValue.x == this.diffData['translation'].newValue.x) && (this.diffData['translation'].previousValue.y != this.diffData['translation'].newValue.y),
                    'fa-arrows': this.diffData['translation'] != undefined && (this.diffData['translation'].previousValue.x != this.diffData['translation'].newValue.x) && (this.diffData['translation'].previousValue.y != this.diffData['translation'].newValue.y),
                    'fa-expand fa-rotate-135': this.diffData['scaling'] != undefined && (this.diffData['scaling'].previousValue.w == this.diffData['scaling'].newValue.w) && (this.diffData['scaling'].previousValue.h != this.diffData['scaling'].newValue.h),
                    'fa-expand fa-rotate-45': this.diffData['scaling'] != undefined && (this.diffData['scaling'].previousValue.w != this.diffData['scaling'].newValue.w) && (this.diffData['scaling'].previousValue.h == this.diffData['scaling'].newValue.h),
                    'fa-arrows-alt': this.diffData['scaling'] != undefined && (this.diffData['scaling'].previousValue.w != this.diffData['scaling'].newValue.w) && (this.diffData['scaling'].previousValue.h != this.diffData['scaling'].newValue.h),
                    'fa-tint': this.diffData['backgroundColor'] != undefined,
                    'fa-plus': this.diffData['added'] != undefined,
                }
            }
        },
        styleObject() {
            return {
                backgroundColor: this.diffData['isInput'] ? 'PeachPuff' : ''
            }
        }
    }
});

var VisualState = Vue.component('visual-state', {
    props: ['initialVisualStateModel'],
    template: `<div class='visualStateContainer'>
                    <div v-on:mousedown='actionStarted' class='visualStateCanvas' :style="{width:visualStateModel.maxWidth+'px',height:visualStateModel.maxHeight+'px','min-width':visualStateModel.maxWidth+'px'}">
                        <shape ref="shapes" v-for="shape in shapesModel" v-bind:shape-model="shape" v-bind:parent-visual-state="visualStateModel" ></shape>
                        <input-event-mark v-for="anInputEvent in allInputEvents" v-if="visualStateModel.showAllInputEvents" :initial-input-event="anInputEvent"></input-event-mark>
                        <input-event-mark v-bind:initial-visual-state="visualStateModel"></input-event-mark>
                    </div>
                    <div class="diffContainer">
                        <a class='button visualStateDiff' :class=\"{ 'is-disabled' : nextState === undefined}\" @click='displayDiff'><span class="icon is-small"><i class="fa fa-exchange"></i></span></a>
                        <div v-show='isDisplayingDiff' class='box diffBox'>
                            <diff-element v-for="diff in differencesWithNextState" :diff-data="diff"></div>
                        </div>
                    </div>
                </div>`,
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
    computed: {
        currentInputEvent: {
            get: function() {
                return this.visualStateModel.currentInputEvent
            },
            set: function(newValue) {
                this.visualStateModel.currentInputEvent = newValue
            }
        },
        shapesModel: function() {
            let result = []
            for (var key in this.shapesDictionary) {
                result.push(this.shapesDictionary[key])
            }
            return result
        },
        shapesDictionary: function() {
            return this.visualStateModel.shapesDictionary
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
        differencesWithNextState: {
            cache: false,
            get: function() {
                let result = []
                this.shapesDictionary
                if (this.hasNextState) {
                    let comparedShapesKey = []
                    for (let shapeKey in this.shapesDictionary) {
                        comparedShapesKey.push(shapeKey)
                        let aShape = this.shapesDictionary[shapeKey];
                        let comparingShape = this.nextState.shapeFor(shapeKey)
                        if (comparingShape) {
                            for (let eachDiff of aShape.diffArray(comparingShape)) {
                                result.push(eachDiff);
                            }
                        } else {
                            // result.push('Removed Shape ' + aShape.version.model.id)
                            result.push({ removed: { previousValue: undefined, newValue: aShape.version.model.id } })
                        }
                    }
                    for (let nextShapeKey in this.nextState.shapesDictionary) {
                        if (comparedShapesKey.indexOf(nextShapeKey) < 0) {
                            //key not found
                            // result.push('Added Shape ' + nextShapeKey)
                            result.push({ added: { previousValue: undefined, newValue: nextShapeKey } })
                        }
                    }

                    if (this.currentInputEvent) {
                        if (this.nextState.currentInputEvent) {
                            //Both states have an input event
                            if (this.currentInputEvent.touches.length != this.nextState.currentInputEvent.touches.length) {
                                //TODO there's a difference that needs to be informed
                            } else {
                                for (let i = 0; i < this.currentInputEvent.touches.length; i++) {
                                    if (this.currentInputEvent.touches[i].x != this.nextState.currentInputEvent.touches[i].x || this.currentInputEvent.touches[i].y != this.nextState.currentInputEvent.touches[i].y) {
                                        result.push({ isInput: true, translation: { previousValue: { x: this.currentInputEvent.touches[i].x, y: this.currentInputEvent.touches[i].y }, newValue: { x: this.nextState.currentInputEvent.touches[i].x, y: this.nextState.currentInputEvent.touches[i].y } } })
                                    }
                                }
                            }
                        } else {
                            //The next state removed the input event or didn't set one
                            result.push({ isInput: true, removed: { previousValue: this.currentInputEvent, newValue: this.nextState.currentInputEvent } })
                        }
                    } else {
                        if (this.nextState.currentInputEvent) {
                            //The next state added an input event and I don't have one
                            result.push({ isInput: true, added: { previousValue: this.currentInputEvent, newValue: this.nextState.currentInputEvent } })
                        } else {
                            //Both states don't have an input event
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
            }
            return []
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
                    if (each.version.isPointInside(x, y)) {
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

                globalStore.socket.emit('message-from-desktop', { type: "NEW_SHAPE", message: { id: newShapeModel.model.id, color: newShapeModel.color, width: newShapeModel.width, height: newShapeModel.height, top: newShapeModel.top, left: newShapeModel.left, opacity: newShapeModel.opacity } })
            }
        },

        drawingChanged: function(e, newShapeModel, startingWindowMousePosition) {
            this.updateShapeProperties(e, newShapeModel, startingWindowMousePosition);
        },

        drawingEnded: function(e, newShapeModel) {
            if (this.nextState) {
                this.nextState.didCreateShape(newShapeModel, this);
            }
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
                let previousValue = selectedShapeVM.version.color;
                let newValue = cssStyle['background-color'];

                //First we need to check if we are followingMaster in that property
                if (selectedShapeVM.version.isFollowingMaster('backgroundColor') && previousValue == newValue) {
                    //Don't do anything, keep following master and do not propagate
                } else {

                    selectedShapeVM.version.color = newValue;

                    if (this.nextState) {
                        this.nextState.somethingChangedPreviousState(selectedShapeVM.version.model, previousValue, newValue, 'backgroundColor');
                    }
                }
            };
        },
        canvasOffsetLeft() {
            return this.canvasElement().offsetLeft;
        },
        canvasOffsetTop() {
            return this.canvasElement().offsetTop;
        },
        didSelect(aVisualStateModel, aShapeVM) {
            if (!globalStore.toolbarState.multiSelectionMode || aVisualStateModel !== this.visualStateModel) {
                this.selectedShapes().forEach(function(aSelectedShapeVM) {
                    if (aSelectedShapeVM !== aShapeVM) {
                        aSelectedShapeVM.toggleSelection(false)
                    }
                });
            }
        }
    }
});

class Handler {
    constructor(namePrefix, left, top, right, bottom) {
        this.namePrefix = namePrefix;
        this.left = left;
        this.top = top;
        this.right = right;
        this.bottom = bottom;
    }
    get styleObject() {
        var result = {}
        if (this.left != 0) {
            result.left = this.left + 'px';
        }
        if (this.top != 0) {
            result.top = this.top + 'px';
        }
        if (this.right != 0) {
            result.right = this.right + 'px';
        }
        if (this.bottom != 0) {
            result.bottom = this.bottom + 'px';
        }
        return result;
    }
}

var ShapeVM = Vue.component('shape', {
    props: ['shapeModel', 'parentVisualState'],
    template: `<div :id="'shape'+version.model.id" v-bind:style="styleObject" v-on:mousedown="mouseDownStartedOnShape" ><div v-for="eachHandler in handlers" v-if="isSelected" class="shapeHandler" :id="eachHandler.namePrefix + version.model.id" :style="eachHandler.styleObject" @mousedown="mouseDownStartedOnHandler"></div>`,
    data: function() {
        return {
            visualState: this.parentVisualState,
            isSelected: false,
            version: this.shapeModel,
            handlers: [new Handler('nw', -6, -6, 0, 0), new Handler('ne', 0, -6, -6, 0), new Handler('se', 0, 0, -6, -6), new Handler('sw', -6, 0, 0, -6)] //L T R B
        }
    },
    computed: {
        styleObject: function() {
            // if (this.version) {
            return {
                'backgroundColor': this.version.color,
                'position': 'absolute',
                'left': this.version.left + 'px',
                'top': this.version.top + 'px',
                'width': this.version.width + 'px',
                'height': this.version.height + 'px',
                'border': (this.isSelected ? '4px' : '1px') + ' solid gray',
                'overflow': 'visible',
                'opacity': '1'
            }
            // }
            // return {}
        }
    },
    watch: {
        styleObject: function(val) {
            if (globalStore.visualStates[0] === this.visualState) {
                globalStore.socket.emit('message-from-desktop', { type: "EDIT_SHAPE", message: { id: this.version.model.id, color: this.version.color, width: this.version.width, height: this.version.height, top: this.version.top, left: this.version.left, opacity: this.version.opacity } })
            }
        }
    },
    methods: {
        mouseDownStartedOnHandler(e) {
            if (!this.isSelected) {
                console.log("THIS SHOULD NEVER HAPPEN")
                return
            }
            e.preventDefault();
            e.stopPropagation();

            let startingShapePositionXInWindowCoordinates = this.version.left + this.$parent.canvasOffsetLeft();
            let startingShapePositionYInWindowCoordinates = this.version.top + this.$parent.canvasOffsetTop();
            let startingShapeWidth = this.version.scale.w
            let startingShapeHeight = this.version.scale.h

            let handlerType = e.target.id.substring(0, 2);

            var mouseMoveHandler

            mouseMoveHandler = function(e) {
                this.scalingChanged(e, handlerType, startingShapePositionXInWindowCoordinates, startingShapePositionYInWindowCoordinates, startingShapeWidth, startingShapeHeight);
            }.bind(this)
            let visualStateElement = this.$parent.canvasElement();
            visualStateElement.addEventListener('mousemove', mouseMoveHandler, false);

            var mouseUpHandler
            mouseUpHandler = function(e) {
                visualStateElement.removeEventListener('mousemove', mouseMoveHandler, false);
                visualStateElement.removeEventListener('mouseup', mouseUpHandler, false);
            }.bind(this)
            visualStateElement.addEventListener('mouseup', mouseUpHandler, false);
        },
        mouseDownStartedOnShape(e) {
            if (globalStore.toolbarState.drawMode) {
                return
            }

            e.preventDefault();
            e.stopPropagation();

            if (!this.isSelected) {
                this.toggleSelection();
            }

            //Starting to move a shape
            let currentWindowMousePositionX = e.pageX;
            let currentWindowMousePositionY = e.pageY;
            var offsetX = currentWindowMousePositionX - this.version.left;
            var offsetY = currentWindowMousePositionY - this.version.top;

            var parentElement = this.$el.parentNode;
            //When the second parameter is null in insertBefore the element is added as the last child
            parentElement.insertBefore(this.$el, null);

            var moveHandler = function(e) {
                this.moveChanged(e, offsetX, offsetY);
            }.bind(this);
            window.addEventListener('mousemove', moveHandler, false);

            var upHandler
            upHandler = function(e) {
                window.removeEventListener('mousemove', moveHandler, false);
                window.removeEventListener('mouseup', upHandler, false);
            }.bind(this);
            window.addEventListener('mouseup', upHandler, false);
        },

        moveChanged: function(e, initialOffsetX, initialOffsetY) {
            let currentWindowMousePositionX = e.x;
            let currentWindowMousePositionY = e.y;

            let previousValue = { x: this.version.position.x, y: this.version.position.y };
            let newValue = {
                x: Math.min(Math.max(currentWindowMousePositionX - initialOffsetX, 0), this.visualState.maxWidth),
                y: Math.min(Math.max(currentWindowMousePositionY - initialOffsetY, 0), this.visualState.maxHeight)
            }
            logger('moveChanged');
            logger('previousValue: ' + JSON.stringify(previousValue));
            logger('newValue: ' + JSON.stringify(newValue));
            logger("---------");
            if (this.version.isFollowingMaster('translation') && previousValue.x == newValue.x && previousValue.y == newValue.y) {
                //Don't do anything, keep following master and do not propagate
            } else {
                this.version.left = newValue.x
                this.version.top = newValue.y
                if (this.visualState.nextState) {
                    this.visualState.nextState.somethingChangedPreviousState(this.version.model, previousValue, newValue, 'translation');
                }
            }
        },
        //deprecated
        handlerAtPoint(windowX, windowY) {
            let mouseVisualOutputX = windowX - this.$el.parentElement.offsetLeft;
            let mouseVisualOutputY = windowY - this.$el.parentElement.offsetTop;

            let codes = ['nw', 'ne', 'se', 'sw']
            for (var i = 0; i < codes.length; i++) {
                let handlerCode = codes[i];
                let handler = window.document.getElementById(handlerCode + this.version.model.id);
                let handlerVisualOuputLeft = handler.offsetLeft + this.canvasOffsetLeft();
                let handlerVisualOuputTop = handler.offsetTop + this.canvasOffsetTop();
                if (mouseVisualOutputX > handlerVisualOuputLeft && handlerVisualOuputLeft < handlerVisualOuputLeft + 10 && mouseVisualOutputY > handlerVisualOuputTop && mouseVisualOutputY < handlerVisualOuputTop + 10) {
                    return handler
                }
            }
            return undefined;
        },
        toggleSelection(notify = true) {
            this.isSelected = !this.isSelected;
            if (this.isSelected && notify) {

                this.$parent.didSelect(this.visualState, this);
                // for (let each of globalStore.visualStates) {
                //     each.didSelect(this.visualState, this);
                // }
            }
        },
        deselect() {
            if (this.isSelected) {
                this.isSelected = false;
            }
        },

        scalingChanged(e, handlerType, startingShapePositionXInWindowCoordinates, startingShapePositionYInWindowCoordinates, startingShapeWidth, startingShapeHeight) {
            let previousValue = { w: this.version.scale.w, h: this.version.scale.h };

            let currentWindowMousePositionX = e.x;
            let currentWindowMousePositionY = e.y;

            // let currentShapePositionXInWindowCoordinates = this.version.left + this.visualState.canvasOffsetLeft();
            // let currentShapePositionYInWindowCoordinates = this.version.top + this.visualState.canvasOffsetTop();

            let newValue = {
                w: previousValue.w,
                h: previousValue.h,
            }

            switch (handlerType) {
                case 'se':
                    if (currentWindowMousePositionX < startingShapePositionXInWindowCoordinates) {
                        //The currentWindowMousePositionX controls the startingShapePositionX
                        this.version.left = currentWindowMousePositionX - this.$parent.canvasOffsetLeft()
                    }
                    if (currentWindowMousePositionY < startingShapePositionYInWindowCoordinates) {
                        //The currentWindowMousePositionX controls the startingShapePositionX
                        this.version.top = currentWindowMousePositionY - this.$parent.canvasOffsetTop()
                    }
                    newValue.w = Math.abs(currentWindowMousePositionX - startingShapePositionXInWindowCoordinates);
                    newValue.h = Math.abs(currentWindowMousePositionY - startingShapePositionYInWindowCoordinates);
                    break;
                case 'sw':

                    if (currentWindowMousePositionX < startingShapePositionXInWindowCoordinates + startingShapeWidth) {
                        let offsetX = startingShapePositionXInWindowCoordinates - currentWindowMousePositionX;

                        let startingShapePositionX = startingShapePositionXInWindowCoordinates - this.$parent.canvasOffsetLeft();
                        this.version.left = startingShapePositionX - offsetX;

                        newValue.w = startingShapeWidth + offsetX;
                    } else {
                        newValue.w = currentWindowMousePositionX - (this.version.left + this.$parent.canvasOffsetLeft());
                    }

                    if (currentWindowMousePositionY < startingShapePositionYInWindowCoordinates) {
                        let offsetY = startingShapePositionYInWindowCoordinates - currentWindowMousePositionY;
                        let startingShapePositionY = startingShapePositionYInWindowCoordinates - this.$parent.canvasOffsetTop();
                        this.version.top = startingShapePositionY - offsetY;

                        newValue.h = offsetY;

                    } else {
                        newValue.h = currentWindowMousePositionY - (this.version.top + this.$parent.canvasOffsetTop());
                    }

                    break;
                case 'nw':
                    if (currentWindowMousePositionX < startingShapePositionXInWindowCoordinates + startingShapeWidth) {
                        this.version.left = currentWindowMousePositionX - this.$parent.canvasOffsetLeft();
                    }
                    newValue.w = Math.abs(currentWindowMousePositionX - (startingShapePositionXInWindowCoordinates + startingShapeWidth));

                    if (currentWindowMousePositionY < startingShapePositionYInWindowCoordinates + startingShapeHeight) {
                        this.version.top = currentWindowMousePositionY - this.$parent.canvasOffsetTop();
                    }

                    newValue.h = Math.abs(currentWindowMousePositionY - (startingShapePositionYInWindowCoordinates + startingShapeHeight));

                    break;
                case 'ne':
                    if (currentWindowMousePositionX < startingShapePositionXInWindowCoordinates) {
                        this.version.left = (currentWindowMousePositionX - this.$parent.canvasOffsetLeft());
                    }
                    newValue.w = Math.abs(currentWindowMousePositionX - startingShapePositionXInWindowCoordinates);

                    if (currentWindowMousePositionY < startingShapePositionYInWindowCoordinates + startingShapeHeight) {
                        this.version.top = currentWindowMousePositionY - this.$parent.canvasOffsetTop();
                    }
                    newValue.h = Math.abs(currentWindowMousePositionY - (startingShapePositionYInWindowCoordinates + startingShapeHeight));

                    break;
            }

            if (this.version.isFollowingMaster('scaling') && previousValue.w == newValue.w && previousValue.h == newValue.h) {
                //Don't do anything, keep following master and do not propagate
            } else {
                this.version.width = newValue.w;
                this.version.height = newValue.h;
                if (this.visualState.nextState) {
                    this.visualState.nextState.somethingChangedPreviousState(this.version.model, previousValue, newValue, 'scaling');
                }
            }
        }
    }
});

// create a new Vue instance and mount it to our div element above with the id of app
var outputAreaVM = new Vue({
    el: '#outputArea',
    data: {
        cursorType: globalStore.cursorType,
        shapeCounter: globalStore.shapeCounter
    },
    methods: {
        changeColorOfSelectedShapes: function(cssStyle) {
            for (let each of this.$refs.visualStatesVM) {
                each.changeColorOnSelection(cssStyle);
            }
        }
    },
    computed: {
        visualStates: function() {
            return globalStore.visualStates
        }
    }
});

var toolbarVM = new Vue({
    el: '#toolbar',
    data: {
        toolbarState: globalStore.toolbarState
    },
    methods: {
        drawSelected() {
            this.toolbarState.drawMode = true;
            this.toolbarState.selectionMode = false;
            this.toolbarState.cursorType = "crosshair";
        },
        selectionSelected() {
            this.toolbarState.drawMode = false;
            this.toolbarState.selectionMode = true;
            this.toolbarState.cursorType = "default";
        },
        changeColor() {
            outputAreaVM.changeColorOfSelectedShapes({
                'background-color': this.toolbarState.currentColor
            });
        },

        addVisualState() {
            var allTheVisualStates = globalStore.visualStates;
            var newVisualState = new VisualStateModel()

            if (allTheVisualStates.length > 0) {
                let previousVisualState = allTheVisualStates.last();

                for (let aPreviouslyCreatedShape of previousVisualState.shapes()) {
                    newVisualState.addNewShape(aPreviouslyCreatedShape);
                }

                //TODO: Should we send didCreateShape?

                previousVisualState.nextState = newVisualState;
                newVisualState.previousState = previousVisualState;
            }

            // outputAreaVM.$el.appendChild(newVisualState.$el)

            allTheVisualStates.push(newVisualState);
        }
    },
    created: function() {
        this.addVisualState();
    }

});

window.addEventListener('load', function(e) {
    globalStore.context = document.getElementById('myCanvas').getContext("2d");
    globalStore.context.fillStyle = "#9ea7b8";
    globalStore.context.fillRect(0, 0, globalStore.context.canvas.width, globalStore.context.canvas.height);
    // globalStore.context.strokeStyle = "#df4b26";
    // globalStore.context.lineJoin = "round";
    // globalStore.context.lineWidth = 5;

    // globalStore.context.moveTo(0, 0);
    // globalStore.context.lineTo(200, 100);
    // globalStore.context.stroke();

    function drawTouches() {
        let points = globalStore.inputEvents;
        globalStore.context.clearRect(0, 0, globalStore.context.canvas.width, globalStore.context.canvas.height);
        globalStore.context.lineWidth = 3;
        for (let i = 1; i < points.length; i++) {
            for (let j = 0; j < Math.max(Math.min(points[i - 1].touches.length, points[i].touches.length), 1); j++) {
                globalStore.context.beginPath();
                globalStore.context.moveTo(points[i - 1].touches[j].x, points[i - 1].touches[j].y);
                globalStore.context.lineTo(points[i].touches[j].x, points[i].touches[j].y);
                globalStore.context.strokeStyle = "black";
                globalStore.context.stroke();
            }
        }
    }

    let amountOfTouchesLeft = 0

    globalStore.socket.on('message-from-server', function(data) {
        // console.log(data)
        let anInputEvent = data.message

        if (anInputEvent.type == 'touchend') {
            amountOfTouchesLeft -= 1;
            if (amountOfTouchesLeft == 0) {
                globalStore.isRecording = false
                globalStore.socket.emit('message-from-desktop', { type: "STOP_RECORDING", message: undefined })
            }
        } else {
            amountOfTouchesLeft = Math.max(amountOfTouchesLeft, anInputEvent.touches.length)

            if (anInputEvent.type == "touchstart") {
                globalStore.inputEvents.removeAll();
            } else if (anInputEvent.type == 'touchmove') {
                drawTouches()
            } else {
                console.log("UNKNOWN INPUT TYPE");
            }
        }

        globalStore.inputEvents.push(anInputEvent);
    });
});
