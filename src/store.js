// import Vue from 'vue';
// import Vuex from 'vuex';

// Vue.use(Vuex);

// export const store = new Vuex.Store({
//     state: {
//         visualStates: []
//         inputEvents: []
//     }
// });

import Vue from 'vue';
import io from 'socket.io-client';

let isLoggerActive = false;
let logger = function(text) {
    if (isLoggerActive) {
        console.log(text);
    }
}

export { VisualStateModel, RuleModel, MeasureInput, TouchInput, logger }

export const globalBus = new Vue();

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
            measureMode: false,
            currentColor: '#1a60f3'
        },
        cursorType: 'auto',
        context: undefined,
        rules: [],
        mobileWidth: 375,
        mobileHeight: 667
    },
    computed: {
        socket() {
            //TODO check if putting this as a computed property is legit
            return io.connect('http://localhost:3000')
        }
    }
})

class Measure {
    constructor(visualState,fromShapeId, fromHandlerName, toShapeId, toHandlerName, cachedPosition) {
        this.visualState = visualState
        this.fromShapeId = fromShapeId
        this.fromHandlerName = fromHandlerName
        this.toShapeId = toShapeId
        this.toHandlerName = toHandlerName
        this.cachedPosition = cachedPosition
    }
    get fromShape() {
        return this.visualState.shapesDictionary[this.fromShapeId];
    }
    get toShape() {
        return this.visualState.shapesDictionary[this.toShapeId];
    }
    get initialPoint() {
        return this.fromShape.positionOfHandler(this.fromHandlerName)
    }
    get finalPoint() {
        if (this.toShapeId) {
            return this.toShape.positionOfHandler(this.toHandlerName)
        }
        return this.cachedPosition
    }
    get deltaX() {
        return this.finalPoint.x - this.initialPoint.x
    }
    get width() {
        return Math.abs(this.finalPoint.x - this.initialPoint.x)
    }
    get deltaY() {
        return this.finalPoint.y - this.initialPoint.y
    }
    get height() {
        return Math.abs(this.finalPoint.y - this.initialPoint.y)
    }
}

class VisualStateModel {
    constructor() {
        this.shapesDictionary = {}
        this.measures = []
        this.currentInputEvent = undefined
        this.nextState = undefined
        this.previousState = undefined
        this.maxWidth = globalStore.mobileWidth
        this.maxHeight = globalStore.mobileHeight
        this.showAllInputEvents = false
    }
    get currentInputEventIndex() {
        return globalStore.inputEvents.indexOf(this.currentInputEvent)
    }
    get percentageInTimeline() {
        if (this.currentInputEventIndex >= 0) {
            let totalEventCount = globalStore.inputEvents.length
            return this.currentInputEventIndex * 100 / totalEventCount;
        } else {
            // return globalStore.visualStates.indexOf(this) * 100 / (globalStore.visualStates.length - 1);
            return globalStore.visualStates.indexOf(this) * 100 / globalStore.visualStates.length;

        }
    }
    importMeasuresFrom(previousState) {
        for (let previousMeasure of previousState.measures) {
            let newMeasure = this.importMeasure(previousMeasure)
        }
    }
    importMeasure(previousMeasure){
        return this.addNewMeasure(previousMeasure.fromShapeId,previousMeasure.fromHandlerName,previousMeasure.toShapeId,previousMeasure.toHandlerName,previousMeasure.cachedPosition)
    }

    addNewMeasure(fromShapeId,fromHandlerName,toShapeId,toHandlerName, cachedPosition) {
        let newMeasure = new Measure(this,fromShapeId, fromHandlerName, toShapeId, toHandlerName, cachedPosition)
        this.measures.push(newMeasure)
        if (this.nextState) {
            this.nextState.importMeasure(newMeasure)
        }
        return newMeasure
    }
    removeMeasure(aMeasure) {
        let index = this.measures.indexOf(aMeasure)
        if (index >= 0) {
            this.measures.splice(index,1)
        }
        aMeasure.visualState = undefined
    }
    addNewShape(protoShape) {
        let correspondingVersion

        if (protoShape) {
            //Cheap way of cloning the version
            correspondingVersion = new ShapeModelVersion(protoShape.id, protoShape);
        } else {
            let newShapeCount = globalStore.shapeCounter++;
            correspondingVersion = new ShapeModelVersion('shape'+newShapeCount, undefined, 'white', 0, 0, 0, 0);
        }

        // if (oldShapeVM) {
        //     newShapeVM.isSelected = oldShapeVM.isSelected
        // }
        // var newShapeVM = new ShapeVM({ data: { visualState: this, version: correspondingVersion } });

        // newShapeVM.$mount();
        // this.canvasElement().appendChild(newShapeVM.$el);
        // Vue.set(this.shapesDictionary, newShapeVM.id, newShapeVM);
        Vue.set(this.shapesDictionary, correspondingVersion.id, correspondingVersion);

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
    somethingChangedPreviousState(shapeId, previousValue, changedValue, changedPropertyName) {
        let relatedShape = this.shapesDictionary[shapeId]
        if (!relatedShape) {
            return;
        }
        let newPreviousValue = previousValue;

        if (!relatedShape.isFollowingMaster(changedPropertyName)) {
            newPreviousValue = relatedShape.valueForProperty(changedPropertyName);
        }

        if (relatedShape.areEqualValues(changedPropertyName, newPreviousValue, previousValue)) {
            //Equal values, this shape should keep or start following the master
            relatedShape.followMaster(changedPropertyName);

            if (this.nextState) {
                this.nextState.somethingChangedPreviousState(shapeId, newPreviousValue, changedValue, changedPropertyName);
            }
        } else {
            logger("newPreviousValue is NOT equal to previousValue")

            //Shape is getting it s own value, so its not following the materVersion anymore
            if (relatedShape.isFollowingMaster(changedPropertyName)) {
                relatedShape[changedPropertyName].value = changedValue
            }
        }
    }
    deleteShape(aShapeModel) {
        aShapeModel.unfollowMaster()

        if (this.nextState) {
            let connectedShape = this.nextState.shapeFor(aShapeModel.id)
            if (connectedShape) {
                if (connectedShape.isFollowingMaster()) {
                    this.nextState.deleteShape(connectedShape)
                } else {
                    connectedShape.unfollowMaster()
                }
            }
        }

        Vue.delete(this.shapesDictionary,aShapeModel.id)
        // this.shapesDictionary[aShapeModel.id] = undefined

        if (globalStore.visualStates[0] === this) {
            globalStore.socket.emit('message-from-desktop', { type: "DELETE_SHAPE", message: { id: aShapeModel.id } })
        }
    }
}

class ShapeModelVersion {
    constructor(id, aMasterVersion, aColor = '', left = null, top = null, width = null, height = null) {
        this.id = id;

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
    cssText(opacityValue = 1) {
        return 'background-color:' + this.color + ";" +
            'position:' + 'absolute'  + ";" +
            'left:' + this.left + 'px'  + ";" +
            'top:' + this.top + 'px'  + ";" +
            'width:' + this.width + 'px'  + ";" +
            'height:' + this.height + 'px' + ";" +
            'border:' + ('1px') + ' solid gray' + ";" +
            'overflow:' + 'visible' + ";" +
            'opacity:' + opacityValue
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
    set color(value) {
        this.backgroundColor.value = value;
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
    setOwnPropertiesFromMaster(property) {
        switch (property) {
            case 'backgroundColor':
                this.color = this.color
                break;
            case 'translation':
                this.left = this.left
                this.top = this.top
                break;
            case 'scaling':
                this.width = this.width
                this.height = this.height
                break;
            case '':
            default:
                this.setOwnPropertiesFromMaster('backgroundColor')
                this.setOwnPropertiesFromMaster('translation')
                this.setOwnPropertiesFromMaster('scaling')
                break;
        }
    }
    unfollowMaster(property) {
        this.setOwnPropertiesFromMaster(property)
        this.masterVersion = undefined
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
        // "check all properties"
        return this.isFollowingMaster('backgroundColor') && this.isFollowingMaster('translation') && this.isFollowingMaster('scaling')
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
            changes.push({id:this.id, backgroundColor: { previousValue: this.color, newValue: nextShapeWithTheSameModel.color } })
        }
        if (!nextShapeWithTheSameModel.isFollowingMaster('translation')) {
            // changes.push('Changed position from ' + JSON.stringify(this.position) + ' to ' + JSON.stringify(nextShapeWithTheSameModel.position))
            changes.push({id:this.id,  translation: { previousValue: this.position, newValue: nextShapeWithTheSameModel.position } })
        }
        if (!nextShapeWithTheSameModel.isFollowingMaster('scaling')) {
            // changes.push('Changed size from ' + JSON.stringify(this.scale) + ' to ' + JSON.stringify(nextShapeWithTheSameModel.scale))
            changes.push({id:this.id,  scaling: { previousValue: this.scale, newValue: nextShapeWithTheSameModel.scale } })
        }
        return changes
    }
    positionOfHandler(handlerName) {
        switch (handlerName) {
            case 'ne':
                return {x: this.left + this.width, y: this.top }
            case 'nw':
                return {x: this.left, y: this.top }
            case 'sw':
                return {x: this.left, y: this.top + this.height}
            case 'se':
                return {x: this.left + this.width, y: this.top + this.height}
        }
        console.log("WERIDDDDDDDDDD")
    }
}

class RuleModel {
    constructor(input, output, shouldKeepApplying) {
        this.input = input;
        this.output = output;
        this.shouldKeepApplying = shouldKeepApplying;
        this.enforce = true;
        this.currentOutput = undefined;
    }
    activate(anEvent, globalShapeDictionary) {
        if (this.input.shouldActivate(this, anEvent)) {
            //Does it affect one of the current shapes?
            let controlledShape = globalShapeDictionary[this.output.id]
            if (controlledShape) {
                // if (this.input.condition(event, controlledShape)) {
                    this.currentEvent = anEvent
                    this.currentOutput = controlledShape
                    return true
                // }
            }
        }
        return false
    }
    applyNewInput(newEvent) {
        // let touch = event.touches[0]
        this.input.applyNewInput(this,newEvent)
        this.currentEvent = newEvent

    }
    actuallyApply(delta, newEvent) {
        if (!this.input.condition(newEvent,this.currentOutput)) {
            return
        }
        switch (this.output.property) {
            case 'center':
                for (let i = 0; i < this.output.axis.length; i++) {
                    let eachOutputAxis = this.output.axis[i];
                    let correspondingInputAxis = this.input.axis[i];
                    if (!correspondingInputAxis) {
                        console.log("the rule does not have an input axis defined for that output axis, but we assume that the first will be used")
                        correspondingInputAxis = this.input.axis[0];
                    }
                    let outputProperty = ''
                    switch (eachOutputAxis) {
                        case 'x':
                            outputProperty = 'centerX';
                            break
                        case 'y':
                            outputProperty = 'centerY';
                            break;
                    }
                    let newValue = this.currentOutput[outputProperty] + delta[correspondingInputAxis]
                    if (this.shouldKeepApplying(this.currentOutput[outputProperty], newValue)) {
                        this.currentOutput[outputProperty] = newValue
                    }
                }
                break;
            case 'position':
                for (let i = 0; i < this.output.axis.length; i++) {
                    let eachOutputAxis = this.output.axis[i];
                    let correspondingInputAxis = this.input.axis[i];
                    if (!correspondingInputAxis) {
                        console.log("the rule does not have an input axis defined for that output axis, but we assume that the first will be used")
                        correspondingInputAxis = this.input.axis[0];
                    }
                    let outputProperty = ''
                    switch (eachOutputAxis) {
                        case 'x':
                            outputProperty = 'left';
                            break
                        case 'y':
                            outputProperty = 'top';
                            break;
                    }
                    let newValue = this.currentOutput[outputProperty] + delta[correspondingInputAxis]
                    if (this.shouldKeepApplying(this.currentOutput[outputProperty], newValue)) {
                        this.currentOutput[outputProperty] = newValue
                    }
                }
                break;
            case 'size':
                for (let i = 0; i < this.output.axis.length; i++) {
                    let eachOutputAxis = this.output.axis[i];
                    let correspondingInputAxis = this.input.axis[i];
                    if (!correspondingInputAxis) {
                        console.log("the rule does not have an input axis defined for that output axis, but we assume that the first will be used")
                        correspondingInputAxis = this.input.axis[0];
                    }
                    let outputProperty = ''
                    let complementaryProperty = undefined
                    switch (eachOutputAxis) {
                        case 'x':
                            outputProperty = 'width';
                            complementaryProperty = 'left'
                            break
                        case 'y':
                            outputProperty = 'height';
                            complementaryProperty = 'top'
                                    //             target.height = newValue
        //             target.top -= (newValue - previousValue) / 2
                            break;
                    }

                    let newValue = this.currentOutput[outputProperty] + delta[correspondingInputAxis]
                    if (this.shouldKeepApplying(this.currentOutput[outputProperty], newValue)) {
                        this.currentOutput[outputProperty] = newValue
                        if (complementaryProperty) {
                            this.currentOutput[complementaryProperty] = this.currentOutput[complementaryProperty] + delta[correspondingInputAxis] / 2
                        }
                    }
                }
                break;
            }
    }
}

class TouchInput {
    constructor(touchId, property, listOfAxis, aShouldApplyFn) {
        this.touchId = touchId
        this.property = property
        this.axis = listOfAxis
        this.condition = function(event, aShape) { return aShouldApplyFn(this.touchFor(event),aShape); }
    }
    shouldActivate(aRule, anEvent) {
        //The event has the corresponding touch
        return anEvent.touches[this.touchId] != undefined
    }
    touchFor(event) {
        return event.touches[this.touchId]
    }
    applyNewInput(aRule, newEvent) {
        let previousTouch = aRule.currentEvent.touches[this.touchId]

        let touch = newEvent.touches[this.touchId]

        if (this.axis.length > aRule.output.axis.length) {
            console.log("Fatal error: there are more input axis than output axis on this rule: " + aRule)
            abort()
        }

        let delta = { x: 0, y: 0 }
        if (this.property == 'position') {
            for (let eachInputAxis of this.axis) {
                delta[eachInputAxis] = touch['page' + eachInputAxis.toUpperCase()] - previousTouch['page' + eachInputAxis.toUpperCase()]
            }
        }

        aRule.actuallyApply(delta, newEvent)
    }
}

class MeasureInput {
    constructor(measureFunction,listOfAxis) {
        this.axis = listOfAxis
        this.measureFunction = measureFunction
    }
    shouldActivate(aRule, anEvent) {
        //For now, the measure rules should be always active (maybe if the related shaped are not present this should be false)
        return true;
    }
    condition(event,aShape) {
        return true;
    }
    applyNewInput(aRule,newEvent) {
        let result = this.measureFunction(aRule,newEvent)
        let previousValue = result.previousValue
        let newValue = result.newValue

        if (this.axis.length > aRule.output.axis.length) {
            console.log("Fatal error: there are more input axis than output axis on this rule: " + aRule)
            abort()
        }

        let delta = { x: 0, y: 0 }
        for (let eachInputAxis of this.axis) {
            delta[eachInputAxis] = newValue[eachInputAxis] - previousValue[eachInputAxis]
        }

        // if (aRule.shouldKeepApplying(previousValue, newValue)) {
        //     switch(this.propertyToChange) {
        //         case 'height':
        //             target.height = newValue
        //             target.top -= (newValue - previousValue) / 2

        //             break;
        //         case 'width':
        //             target.width = newValue
        //             target.left -= (newValue - previousValue) / 2

        //             break;
        //         case 'center':
        //             target.center = newValue

        //             break;
        //     }
        // }
        aRule.actuallyApply(delta, newEvent)
    }
}