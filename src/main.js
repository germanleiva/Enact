import Vue from 'vue'
import io from 'socket.io-client';

// import App from './App.vue'

require('bulma/css/bulma.css')
require('font-awesome/css/font-awesome.css')
require('./index.css')

// import store from './store.js'

let socket = io.connect('http://localhost:3000');
let context = undefined

let timelineAreaVM

Vue.component('visual-state-mark', {
    props: ['initialVisualState'],
    data: function() {
        return { visualState: this.initialVisualState }
    },
    template: `<div class="mark" :style="styleObject" v-on:mousedown="draggingStartedVisualStateMark"><slot></slot></div>`,
    computed: {
        styleObject() {
            return {
                left: this.percentageInTimeline + '%'
            }
        },
        percentageInTimeline() {
            if (this.visualState.currentInputEvent) {
                let totalEventCount = timelineAreaVM.inputEvents.length
                let index = timelineAreaVM.inputEvents.indexOf(this.visualState.currentInputEvent)

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
            let inputTimelineElement = timelineAreaVM.$el.getElementsByClassName('inputTimeline')[0];
            let moveHandler = function(e) {
                e.stopPropagation();
                e.preventDefault();
                let percentageInTimeline = (e.x - mouseTargetOffsetX) * 100 / inputTimelineElement.clientWidth;
                percentageInTimeline = Math.max(Math.min(percentageInTimeline, 100), 0);

                // visualStateMark.style.left = percentageInTimeline + '%';

                let totalEventCount = timelineAreaVM.inputEvents.length
                let index = Math.round(totalEventCount * percentageInTimeline / 100)
                index = Math.max(Math.min(index, totalEventCount - 1), 0);

                let correspondingInputEvent = timelineAreaVM.inputEvents[index]

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
        toolbarVM.multiSelectionMode = true;
    }
});
window.addEventListener('keyup', function(e) {
    toolbarVM.multiSelectionMode = false;
});

let isLoggerActive = false;
let logger = function(text) {
    if (isLoggerActive) {
        console.log(text);
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
}

timelineAreaVM = new Vue({
    el: '#timelineArea',
    data: {
        visualStates: [],
        inputEvents: []
    },
    methods: {
        startRecording() {

        }
    }
});

Vue.component('input-event-mark', {
    props: ['initialVisualState', 'initialInputEvent'],
    template: `<div v-if="inputEvent !== undefined" :style="styleObject" v-on:mousedown="draggedInputEventMark"></div>`,
    data: function() {
        return { visualState: this.initialVisualState }
    },
    computed: {
        inputEvent() {
            if (this.visualState) {
                return this.visualState.currentInputEvent
            }
            return this.initialInputEvent
        },
        styleObject() {
            return {
                borderRadius: '15px',
                position: 'absolute',
                left: this.inputEvent.pageX + 'px',
                top: this.inputEvent.pageY + 'px',
                width: '30px',
                height: '30px',
                backgroundColor: this.visualState ? 'red' : 'pink',
                'z-index': 9999
            };
        }
    },
    methods: {
        draggedInputEventMark(e) {
            let mouseMoveHandler;

            let startingMousePositionX = e.x;

            let initialIndex = timelineAreaVM.inputEvents.indexOf(this.inputEvent);
            mouseMoveHandler = function(e) {
                let deltaX = e.x - startingMousePositionX
                let indexVariation = Math.floor(deltaX / 2);
                let newIndex = Math.max(Math.min(initialIndex + indexVariation, timelineAreaVM.inputEvents.length - 1), 0);
                this.visualState.currentInputEvent = timelineAreaVM.inputEvents[newIndex];
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
        }
    }

})

Vue.component('diff-element', {
    props: ['diffData'],
    template: `"<a class='button'><i class='fa' v-bind:class="classObject"></i></a>"`,
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
                    'fa-minus': this.diffData['removed'] != undefined
                }
            }
        }
    }
});

var VisualState = Vue.extend({
    template: `<div class='visualStateContainer'>
                    <div v-on:mousedown='actionStarted' class='visualStateCanvas'>
                        <input-event-mark v-for="anInputEvent in allInputEvents" v-if="showAllInputEvents" :initial-input-event="anInputEvent"></input-event-mark>
                        <input-event-mark :initial-visual-state="this"></input-event-mark>
                    </div>
                    <div class="diffContainer">
                        <a class='button visualStateDiff' :class=\"{ 'is-disabled' : nextState === undefined}\" @click='displayDiff'>Diff</a>
                        <div v-show='isDisplayingDiff' class='box diffBox'>
                            <diff-element v-for="diff in differencesWithNextState" :diff-data="diff"></div>
                        </div>
                    </div>
                </div>`,
    data: function() {
        return {
            currentInputEvent: undefined,
            shapesDictionary: {},
            nextState: undefined,
            previousState: undefined,
            isDisplayingDiff: false,
            showAllInputEvents: false,
            allInputEvents: timelineAreaVM.inputEvents
        }
    },
    computed: {
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
                }
                return result
            }
        },

        hasNextState() {
            return this.nextState !== undefined;
        }
    },
    methods: {
        shapeFor(aShapeKey) {
            return this.shapesDictionary[aShapeKey];
        },
        displayDiff() {
            this.isDisplayingDiff = !this.isDisplayingDiff;
        },
        canvasElement() {
            return this.$el.getElementsByClassName("visualStateCanvas")[0]
        },
        shapes() {
            let result = [];
            for (let shapeModelId in this.shapesDictionary) {
                result.push(this.shapesDictionary[shapeModelId]);
            }
            return result;
        },
        selectedShapes: function() {
            return this.shapes().filter(each => each.isSelected);
        },
        actionStarted: function(e) {
            if (toolbarVM.drawMode) {
                this.drawingStarted(e);
            } else if (toolbarVM.selectionMode) {
                let selectedShape = null;

                //We traverse the shapes in backward order
                let allShapes = this.shapes()
                for (var i = allShapes.length - 1; i >= 0; i--) {
                    var each = allShapes[i];
                    if (each.isPointInside(e.x, e.y)) {
                        each.toggleSelection();

                        if (each.isSelected) {
                            selectedShape = each;
                        }
                        continue;
                    }
                }

                if (!toolbarVM.multiSelectionMode) {
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
            var newShapeVM = this.addNewShape();

            let startingWindowMousePosition = {
                x: e.x,
                y: e.y
            };

            var mouseMoveHandler

            mouseMoveHandler = function(e) {
                this.drawingChanged(e, newShapeVM, startingWindowMousePosition)
            }.bind(this)

            var mouseUpHandler
            mouseUpHandler = function(e) {
                this.drawingEnded(e, newShapeVM)
                this.$el.removeEventListener('mousemove', mouseMoveHandler, false);
                this.$el.removeEventListener('mouseup', mouseUpHandler, false);
            }.bind(this)

            this.$el.addEventListener('mousemove', mouseMoveHandler, false);
            this.$el.addEventListener('mouseup', mouseUpHandler, false);
        },

        drawingChanged: function(e, newShapeVM, startingWindowMousePosition) {
            this.updateShapeProperties(e, newShapeVM, startingWindowMousePosition);
        },

        drawingEnded: function(e, newShapeVM) {
            if (this.nextState) {
                this.nextState.didCreateShape(newShapeVM, this);
            }
        },

        updateShapeProperties: function(e, newShapeVM, startingWindowMousePosition) {
            //Maybe this should go in Shape
            let currentWindowMousePositionX = e.x;
            let currentWindowMousePositionY = e.y;
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

            newShapeVM.version.top = topValue - this.canvasOffsetTop();
            newShapeVM.version.left = leftValue - this.canvasOffsetLeft();
            newShapeVM.version.width = widthValue;
            newShapeVM.version.height = heightValue;
        },

        somethingChangedPreviousState(model, previousValue, changedValue, changedPropertyName) {
            let relatedShape = this.shapesDictionary[model.id]
            if (!relatedShape) {
                return;
            }
            let newPreviousValue = previousValue;

            if (!relatedShape.version.isFollowingMaster(changedPropertyName)) {
                newPreviousValue = relatedShape.version.valueForProperty(changedPropertyName);
                // newPreviousValue = relatedShape.version.nonZeroValue(changedPropertyName);
            }

            if (relatedShape.version.areEqualValues(changedPropertyName, newPreviousValue, previousValue)) {
                //Equal values, this shape should keep or start following the master
                relatedShape.version.followMaster(changedPropertyName);

                if (this.nextState) {
                    this.nextState.somethingChangedPreviousState(model, newPreviousValue, changedValue, changedPropertyName);
                }
            } else {
                logger("newPreviousValue is NOT equal to previousValue")

                //Shape is getting it s own value, so its not following the materVersion anymore
                if (relatedShape.version.isFollowingMaster(changedPropertyName)) {
                    relatedShape.version[changedPropertyName].value = changedValue
                }
            }
        },
        changeColorOnSelection: function(cssStyle) {
            var currentVisualStateVM = this;
            for (let selectedShapeVM of this.selectedShapes()) {
                //The first previousValue needs to be an actualValue
                let previousValue = selectedShapeVM.version.color;
                let newValue = cssStyle['background-color'];

                //First we need to check if we are followingMaster in that property
                if (selectedShapeVM.version.isFollowingMaster('backgroundColor') && previousValue == newValue) {
                    //Don't do anything, keep following master and do not propagate
                } else {

                    selectedShapeVM.version.color = newValue;

                    if (currentVisualStateVM.nextState) {
                        currentVisualStateVM.nextState.somethingChangedPreviousState(selectedShapeVM.version.model, previousValue, newValue, 'backgroundColor');
                    }
                }
            };
        },
        addNewShape(oldShapeVM) {
            var newShapeVM = new ShapeVM();
            newShapeVM.visualState = this;

            if (oldShapeVM) {
                //Cheap way of cloning the version
                newShapeVM.version = new ShapeModelVersion(oldShapeVM.version.model, oldShapeVM.version);
            } else {
                let newId = outputAreaVM.shapeCounter++;
                newShapeVM.version = new ShapeModelVersion(new ShapeModel(newId), undefined, 'white', 0, 0, 0, 0);
            }

            // if (oldShapeVM) {
            //     newShapeVM.isSelected = oldShapeVM.isSelected
            // }

            newShapeVM.$mount();
            this.canvasElement().appendChild(newShapeVM.$el);
            Vue.set(this.shapesDictionary, newShapeVM.version.model.id, newShapeVM);

            return newShapeVM;
        },
        canvasOffsetLeft() {
            return this.canvasElement().offsetLeft;
        },
        canvasOffsetTop() {
            return this.canvasElement().offsetTop;
        },

        didCreateShape(newlyCreatedShape, previousState) {
            if (this.previousState !== previousState) {
                console.log("WARNING: THIS SHOULDN'T HAPPEN");
            }

            let ourNewlyCreatedShape = this.addNewShape(newlyCreatedShape);
            if (this.nextState) {
                this.nextState.didCreateShape(ourNewlyCreatedShape, this);
            }
        },
        didSelect(aVisualState, aShapeVM) {
            if (!toolbarVM.multiSelectionMode || aVisualState !== this) {
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

var ShapeVM = Vue.extend({
    template: `<div v-bind:style="styleObject" v-on:mousedown="mouseDownStartedOnShape" ><div v-for="eachHandler in handlers" v-if="isSelected" class="shapeHandler" :id="eachHandler.namePrefix + version.model.id" :style="eachHandler.styleObject" @mousedown="mouseDownStartedOnHandler"></div>`,
    data: function() {
        return {
            visualState: undefined,
            isSelected: false,
            version: undefined,
            handlers: [new Handler('nw', -6, -6, 0, 0), new Handler('ne', 0, -6, -6, 0), new Handler('se', 0, 0, -6, -6), new Handler('sw', -6, 0, 0, -6)] //L T R B
        }
    },
    computed: {
        styleObject: function() {
            return {
                'backgroundColor': this.version.color,
                'position': 'absolute',
                'left': this.version.left + 'px',
                'top': this.version.top + 'px',
                'width': this.version.width + 'px',
                'height': this.version.height + 'px',
                'border': (this.isSelected ? '4px' : '1px') + ' solid gray',
                'overflow': 'visible'
            }
        }
    },
    methods: {
        diffArray(nextShapeWithTheSameModel) {
            let changes = []
            if (!nextShapeWithTheSameModel.version.isFollowingMaster('backgroundColor')) {
                // changes.push('Changed color from ' + this.version.color + ' to ' + nextShapeWithTheSameModel.version.color)
                changes.push({ backgroundColor: { previousValue: this.version.color, newValue: nextShapeWithTheSameModel.version.color } })
            }
            if (!nextShapeWithTheSameModel.version.isFollowingMaster('translation')) {
                // changes.push('Changed position from ' + JSON.stringify(this.version.position) + ' to ' + JSON.stringify(nextShapeWithTheSameModel.version.position))
                changes.push({ translation: { previousValue: this.version.position, newValue: nextShapeWithTheSameModel.version.position } })
            }
            if (!nextShapeWithTheSameModel.version.isFollowingMaster('scaling')) {
                // changes.push('Changed size from ' + JSON.stringify(this.version.scale) + ' to ' + JSON.stringify(nextShapeWithTheSameModel.version.scale))
                changes.push({ scaling: { previousValue: this.version.scale, newValue: nextShapeWithTheSameModel.version.scale } })
            }
            return changes
        },
        mouseDownStartedOnHandler(e) {
            if (!this.isSelected) {
                console.log("THIS SHOULD NEVER HAPPEN")
                return
            }
            e.preventDefault();
            e.stopPropagation();

            let startingShapePositionXInWindowCoordinates = this.version.left + this.visualState.canvasOffsetLeft();
            let startingShapePositionYInWindowCoordinates = this.version.top + this.visualState.canvasOffsetTop();
            let startingShapeWidth = this.version.scale.w
            let startingShapeHeight = this.version.scale.h

            let handlerType = e.target.id.substring(0, 2);

            var mouseMoveHandler

            mouseMoveHandler = function(e) {
                this.scalingChanged(e, handlerType, startingShapePositionXInWindowCoordinates, startingShapePositionYInWindowCoordinates, startingShapeWidth, startingShapeHeight);
            }.bind(this)
            let visualStateElement = this.visualState.canvasElement();
            visualStateElement.addEventListener('mousemove', mouseMoveHandler, false);

            var mouseUpHandler
            mouseUpHandler = function(e) {
                visualStateElement.removeEventListener('mousemove', mouseMoveHandler, false);
                visualStateElement.removeEventListener('mouseup', mouseUpHandler, false);
            }.bind(this)
            visualStateElement.addEventListener('mouseup', mouseUpHandler, false);
        },
        mouseDownStartedOnShape(e) {
            if (toolbarVM.drawMode) {
                return
            }

            e.preventDefault();
            e.stopPropagation();

            if (!this.isSelected) {
                this.toggleSelection();
            }

            //Starting to move a shape
            let currentWindowMousePositionX = e.x;
            let currentWindowMousePositionY = e.y;
            var offsetX = currentWindowMousePositionX - this.version.left;
            var offsetY = currentWindowMousePositionY - this.version.top;

            var parentElement = this.$el.parentNode;
            //When the second parameter is null in insertBefore the element is added as the last child
            parentElement.insertBefore(this.$el, null);

            var moveHandler = function(e) {
                this.moveChanged(e, offsetX, offsetY);
            }.bind(this);
            let visualStateElement = this.visualState.$el;
            visualStateElement.addEventListener('mousemove', moveHandler, false);

            var upHandler
            upHandler = function(e) {
                visualStateElement.removeEventListener('mousemove', moveHandler, false);
                visualStateElement.removeEventListener('mouseup', upHandler, false);
            }.bind(this);
            visualStateElement.addEventListener('mouseup', upHandler, false);
        },

        moveChanged: function(e, initialOffsetX, initialOffsetY) {
            let currentWindowMousePositionX = e.x;
            let currentWindowMousePositionY = e.y;

            let previousValue = { x: this.version.position.x, y: this.version.position.y };
            let newValue = {
                x: Math.min(Math.max(currentWindowMousePositionX - initialOffsetX,0),this.visualState.canvasElement().clientWidth),
                y: Math.min(Math.max(currentWindowMousePositionY - initialOffsetY,0),this.visualState.canvasElement().clientHeight)
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
        isPointInside: function(windowX, windowY) {
            let x = windowX - this.$el.parentElement.offsetLeft;
            let y = windowY - this.$el.parentElement.offsetTop;
            return this.version.top < y && this.version.left < x && x < this.version.left + this.version.width && y < this.version.top + this.version.height;
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
                outputAreaVM.didSelectShapeAtVisualState(this.visualState, this);
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
                        this.version.left = currentWindowMousePositionX - this.visualState.canvasOffsetLeft()
                    }
                    if (currentWindowMousePositionY < startingShapePositionYInWindowCoordinates) {
                        //The currentWindowMousePositionX controls the startingShapePositionX
                        this.version.top = currentWindowMousePositionY - this.visualState.canvasOffsetTop()
                    }
                    newValue.w = Math.abs(currentWindowMousePositionX - startingShapePositionXInWindowCoordinates);
                    newValue.h = Math.abs(currentWindowMousePositionY - startingShapePositionYInWindowCoordinates);
                    break;
                case 'sw':

                    if (currentWindowMousePositionX < startingShapePositionXInWindowCoordinates + startingShapeWidth) {
                        let offsetX = startingShapePositionXInWindowCoordinates - currentWindowMousePositionX;

                        let startingShapePositionX = startingShapePositionXInWindowCoordinates - this.visualState.canvasOffsetLeft();
                        this.version.left = startingShapePositionX - offsetX;

                        newValue.w = startingShapeWidth + offsetX;
                    } else {
                        newValue.w = currentWindowMousePositionX - (this.version.left + this.visualState.canvasOffsetLeft());
                    }

                    if (currentWindowMousePositionY < startingShapePositionYInWindowCoordinates) {
                        let offsetY = startingShapePositionYInWindowCoordinates - currentWindowMousePositionY;
                        let startingShapePositionY = startingShapePositionYInWindowCoordinates - this.visualState.canvasOffsetTop();
                        this.version.top = startingShapePositionY - offsetY;

                        newValue.h = offsetY;

                    } else {
                        newValue.h = currentWindowMousePositionY - (this.version.top + this.visualState.canvasOffsetTop());
                    }

                    break;
                case 'nw':
                    if (currentWindowMousePositionX < startingShapePositionXInWindowCoordinates + startingShapeWidth) {
                        this.version.left = currentWindowMousePositionX - this.visualState.canvasOffsetLeft();
                    }
                    newValue.w = Math.abs(currentWindowMousePositionX - (startingShapePositionXInWindowCoordinates + startingShapeWidth));

                    if (currentWindowMousePositionY < startingShapePositionYInWindowCoordinates + startingShapeHeight) {
                        this.version.top = currentWindowMousePositionY - this.visualState.canvasOffsetTop();
                    }

                    newValue.h = Math.abs(currentWindowMousePositionY - (startingShapePositionYInWindowCoordinates + startingShapeHeight));

                    break;
                case 'ne':
                    if (currentWindowMousePositionX < startingShapePositionXInWindowCoordinates) {
                        this.version.left = (currentWindowMousePositionX - this.visualState.canvasOffsetLeft());
                    }
                    newValue.w = Math.abs(currentWindowMousePositionX - startingShapePositionXInWindowCoordinates);

                    if (currentWindowMousePositionY < startingShapePositionYInWindowCoordinates + startingShapeHeight) {
                        this.version.top = currentWindowMousePositionY - this.visualState.canvasOffsetTop();
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
        cursorType: 'auto',
        shapeCounter: 0
    },
    methods: {
        changeColorOfSelectedShapes: function(cssStyle) {
            for (let each of this.visualStates) {
                each.changeColorOnSelection(cssStyle);
            }
        },
        didSelectShapeAtVisualState(visualState, shape) {
            for (let each of this.visualStates) {
                each.didSelect(visualState, shape);
            }
        }
    },
    computed: {
        visualStates: function() {
            return timelineAreaVM.visualStates
        }
    }
});

var toolbarVM = new Vue({
    el: '#toolbar',
    data: {
        drawMode: false,
        selectionMode: true,
        multiSelectionMode: false,
        currentColor: '#1a60f3',
    },
    methods: {
        drawSelected() {
            this.drawMode = true;
            this.selectionMode = false;
            outputAreaVM.cursorType = "crosshair";
        },
        selectionSelected() {
            this.drawMode = false;
            this.selectionMode = true;
            outputAreaVM.cursorType = "default";
        },
        changeColor() {
            outputAreaVM.changeColorOfSelectedShapes({
                'background-color': this.currentColor
            });
        },

        addVisualState() {
            var allTheVisualStates = timelineAreaVM.visualStates;
            var newVisualState = new VisualState().$mount()

            if (allTheVisualStates.length > 0) {
                let previousVisualState = allTheVisualStates.last();

                for (let aPreviouslyCreatedShape of previousVisualState.shapes()) {
                    newVisualState.addNewShape(aPreviouslyCreatedShape);
                }

                //TODO: Should we send didCreateShape?

                previousVisualState.nextState = newVisualState;
                newVisualState.previousState = previousVisualState;
            }

            outputAreaVM.$el.appendChild(newVisualState.$el)

            allTheVisualStates.push(newVisualState);
        }
    },
    created: function() {
        this.addVisualState();
    }

});

window.addEventListener('load', function(e) {
    context = document.getElementById('myCanvas').getContext("2d");
    context.fillStyle = "#9ea7b8";
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    // context.strokeStyle = "#df4b26";
    // context.lineJoin = "round";
    // context.lineWidth = 5;

    // context.moveTo(0, 0);
    // context.lineTo(200, 100);
    // context.stroke();

    socket.on('message-from-server', function(data) {
        // console.log(data)
        let positionX = data.message.pageX;
        let positionY = data.message.pageY;

        context.strokeStyle = "#df4b26";
        context.lineJoin = "round";
        context.lineWidth = 5;

        if (data.message.type == "touchstart") {
            timelineAreaVM.inputEvents.removeAll();
            context.clearRect(0, 0, context.canvas.width, context.canvas.height); // Clears the canvas
            context.beginPath();
            context.moveTo(positionX, positionY);
        } else {

            context.lineTo(positionX, positionY);
            context.closePath();
            context.stroke();

            context.moveTo(positionX, positionY);

        }

        timelineAreaVM.inputEvents.push(data.message);
    });
});
