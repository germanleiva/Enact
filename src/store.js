// import Vue from 'vue';
// import Vuex from 'vuex';

// Vue.use(Vuex);

// export const store = new Vuex.Store({
//     state: {
//         visualStates: []
//         inputEvents: []
//     }
// });

import {extendArray} from './collections.js'
extendArray(Array);
import Vue from 'vue';
import io from 'socket.io-client';

let isLoggerActive = false;
let logger = function(text) {
    if (isLoggerActive) {
        console.log(text);
    }
}

export { VisualStateModel, MeasureModel, RuleModel, MeasureInput, TouchInput, logger }

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
            linkingObject: undefined,
            currentColor: '#1a60f3'
        },
        cursorType: 'auto',
        context: undefined,
        rules: [],
        mobileWidth: 410, //iPhone 375 Nexus 5X 410
        mobileHeight: 660 //iPhone 667 Nexus 5X 660
    },
    computed: {
        socket() {
            //TODO check if putting this as a computed property is legit
            return io.connect('http://localhost:3000')
        }
    },
    methods: {
        deselectAllShapes() {
            for (let eachVisualState of this.visualStates) {
                eachVisualState.deselectShapes()
            }
        }
    },
    // watch: {
    //     visualStates: function(newValue,oldValue) {

    //     }
    // }
})

class MeasureModel {
    constructor(visualState,fromShapeId, fromHandlerName, toShapeId, toHandlerName, cachedFinalPosition) {
        this.visualState = visualState
        this.fromShapeId = fromShapeId
        this.fromHandlerName = fromHandlerName
        this.toShapeId = toShapeId
        this.toHandlerName = toHandlerName
        this.cachedFinalPosition = cachedFinalPosition
        this.highlight = false
        this.cachedInitialPosition = undefined
    }
    get id() {
        let p3=this.toShapeId, p4=this.toHandlerName

        if (!p3) {
            p3 = ""
        }

        if (!p4) {
            p4 = ""
        }

        return this.fromShapeId+"-"+this.fromHandlerName+"-"+p3+"-"+p4
    }
    get fromShape() {
        return this.visualState.shapeFor(this.fromShapeId);
    }
    get toShape() {
        return this.visualState.shapeFor(this.toShapeId);
    }
    get initialPoint() {
        if (this.cachedInitialPosition) {
            return this.cachedInitialPosition
        }
        return this.fromShape.positionOfHandler(this.fromHandlerName)
    }
    get finalPoint() {
        if (this.toShapeId) {
            return this.toShape.positionOfHandler(this.toHandlerName)
        }
        return this.cachedFinalPosition
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
    diffArray(nextMeasureWithTheSameModel) {
        let changes = []
        // let myStartingPoint = this.initialPoint
        // let myEndingPoint = this.finalPoint

        // let hisStartingPoint = nextMeasureWithTheSameModel.initialPoint
        // let hisEndingPoint = nextMeasureWithTheSameModel.finalPoint

        // if (myStartingPoint.x == hisStartingPoint.x && myStartingPoint.y == hisStartingPoint.y ) {
        //     //No diff in starting point
        // } else {
        //     changes.push({id:this.id,  translation: { previousValue: myStartingPoint, newValue: hisStartingPoint } })
        // }

        // if (myEndingPoint.x == hisEndingPoint.x && myEndingPoint.y == hisEndingPoint.y) {
        //     //No diff in ending point
        // }  else {
        //     changes.push({id:this.id,  translation: { previousValue: myEndingPoint, newValue: hisEndingPoint } })
        // }

        if (this.width != nextMeasureWithTheSameModel.width || this.height != nextMeasureWithTheSameModel.height) {
            changes.push({id:this.id, type: 'measure', property: { name: "scaling", before: {w: this.width,h:this.height}, after: {w: nextMeasureWithTheSameModel.width, h: nextMeasureWithTheSameModel.height } } })
        }

        return changes
    }
    deleteYourself() {
        let index = this.visualState.measures.indexOf(this)
        if (index >= 0) {
            this.visualState.measures.splice(index,1)
        }
        this.visualState = undefined
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
            this.importMeasureUntilLastVisualState(previousMeasure)
        }
    }
    importMeasureUntilLastVisualState(previousMeasure){
        for (let shapeKey in this.shapesDictionary) {
            if (previousMeasure.fromShapeId == shapeKey) {
                //This VisualState has the starting Shape so we import the measure
                return this.addNewMeasureUntilLastState(previousMeasure.fromShapeId,previousMeasure.fromHandlerName,previousMeasure.toShapeId,previousMeasure.toHandlerName,previousMeasure.cachedFinalPosition)
            }
        }

        if (previousMeasure.fromShapeId == 'canvas') {
            return this.addNewMeasureUntilLastState(previousMeasure.fromShapeId,previousMeasure.fromHandlerName,previousMeasure.toShapeId,previousMeasure.toHandlerName,previousMeasure.cachedFinalPosition)
        }

        return []
    }

    addNewMeasureUntilLastState(fromShapeId,fromHandlerName,toShapeId,toHandlerName, cachedFinalPosition) {
        let result = []
        let newMeasure = new MeasureModel(this,fromShapeId, fromHandlerName, toShapeId, toHandlerName, cachedFinalPosition)
        result.push(newMeasure)
        this.measures.push(newMeasure)
        if (this.nextState) {
            let importedMeasures = this.nextState.importMeasureUntilLastVisualState(newMeasure)
            for (let anImportedMeasure of importedMeasures) {
                result.push(anImportedMeasure)
            }
        }
        return result
    }
    addNewShape(protoShape) {
        let correspondingVersion

        if (protoShape) {
            //Cheap way of cloning the version
            correspondingVersion = new ShapeModel(protoShape.id, protoShape);
        } else {
            let newShapeCount = globalStore.shapeCounter++;
            correspondingVersion = new ShapeModel('shape'+newShapeCount, undefined, 'white', 0, 0, 0, 0);
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
        if (aShapeKey == 'canvas'){
            return CanvasShape;
        }
        return this.shapesDictionary[aShapeKey];
    }
    measureFor(measureToCompare) {
        return this.measures.find(aMeasure => aMeasure.id === measureToCompare.id)
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

        let involvedMeasures = this.measures.filter(aMeasure => aMeasure.fromShapeId == aShapeModel.id || aMeasure.toShapeId == aShapeModel.id)

        for (let anInvolvedMeasure of involvedMeasures) {
            console.log("We deleted the measure "+anInvolvedMeasure.id)
            anInvolvedMeasure.deleteYourself()
        }

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

        aShapeModel.prepareForDeletion()

        Vue.delete(this.shapesDictionary,aShapeModel.id)
        // this.shapesDictionary[aShapeModel.id] = undefined


        if (globalStore.visualStates[0] === this) {
            globalStore.socket.emit('message-from-desktop', { type: "DELETE_SHAPE", message: { id: aShapeModel.id } })
        }
    }
    toggleHighlightForInvolvedElement(shapeOrMeasureId,aBoolean) {
        function togglingHelper(aVisualState) {
            let involvedShape = aVisualState.shapesDictionary[shapeOrMeasureId]
            if (involvedShape) {
                //We need to hightlighted and also the nextShape with the same id
                involvedShape.highlight = aBoolean
            } else {
                //Maybe the diff was talking about a measure
                let involvedMeasure = aVisualState.measures.find(aMeasure => aMeasure.id == shapeOrMeasureId)
                if (involvedMeasure) {
                    involvedMeasure.highlight = aBoolean
                }
            }
        }

        togglingHelper(this)
        togglingHelper(this.nextState)
    }
    deselectShapes(){
        for (let eachShapeKey in this.shapesDictionary) {
            let eachShape = this.shapesDictionary[eachShapeKey]
            eachShape.deselect()
        }
    }
}

class RelevantPoint {
    constructor(shape,namePrefix, percentualX, percentualY) {
        this.shape = shape
        this.namePrefix = namePrefix;
        this.percentualX = percentualX;
        this.percentualY = percentualY;
        this.isHandler = [0,1].includes(percentualX) && [0,1].includes(percentualY)
        this.leftMargin = -6
        this.topMargin = -6
    }
    get left() {
        return this.shape.width * this.percentualX + this.leftMargin
    }
    get top() {
        return this.shape.height * this.percentualY + this.topMargin
    }
}

let CanvasShape = {
    id: 'canvas',
    relevantPoints: [{namePrefix:'origin',isHandler:false,left:0,right:0}],
    positionOfHandler: function(handlerName) {
        if (handlerName == 'origin') {
            return {x:0,y:0}
        } else {
            console.log("SUPER WEIRD")
        }
    }
}

class ShapeModel {
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
        this.highlight = false
        this.isSelected = false

        this.relevantPoints = [new RelevantPoint(this,'northWest',0,0), new RelevantPoint(this,'northEast',1,0), new RelevantPoint(this,'southEast',1,1), new RelevantPoint(this,'southWest',0,1), new RelevantPoint(this,'middleRight',1,0.5), new RelevantPoint(this,'middleLeft',0,0.5), new RelevantPoint(this,'middleTop',0.5,0), new RelevantPoint(this,'middleBottom',0.5,1), new RelevantPoint(this,'center',0.5,0.5)];
    }

    prepareForDeletion() {
        for (let point of this.relevantPoints) {
            point.shape = undefined
        }
    }

    get handlers() {
        return this.relevantPoints.filter(eachPoint => eachPoint.isHandler)
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
        if (!nextShapeWithTheSameModel.isFollowingMaster('backgroundColor') && !this.areEqualValues('backgroundColor',this.backgroundColor.value,nextShapeWithTheSameModel.backgroundColor.value)) {
            // changes.push('Changed color from ' + this.color + ' to ' + nextShapeWithTheSameModel.color)
            changes.push({id:this.id, type: 'output', property: {name: "backgroundColor", before: this.color, after: nextShapeWithTheSameModel.color } })
        }
        if (!nextShapeWithTheSameModel.isFollowingMaster('translation') && !this.areEqualValues('translation',this.translation.value,nextShapeWithTheSameModel.translation.value)) {
            // changes.push('Changed position from ' + JSON.stringify(this.position) + ' to ' + JSON.stringify(nextShapeWithTheSameModel.position))
            changes.push({id:this.id, type: 'output', property: { name: "translation", before: this.position, after: nextShapeWithTheSameModel.position } })
        }
        if (!nextShapeWithTheSameModel.isFollowingMaster('scaling') && !this.areEqualValues('scaling',this.scaling.value,nextShapeWithTheSameModel.scaling.value)) {
            // changes.push('Changed size from ' + JSON.stringify(this.scale) + ' to ' + JSON.stringify(nextShapeWithTheSameModel.scale))
            changes.push({id:this.id, type: 'output', property: { name: "scaling", before: this.scale, after: nextShapeWithTheSameModel.scale } })
        }
        return changes
    }
    positionOfHandler(handlerName) {
        switch (handlerName) {
            case 'northEast':
                return {x: this.left + this.width, y: this.top }
            case 'northWest':
                return {x: this.left, y: this.top }
            case 'southWest':
                return {x: this.left, y: this.top + this.height}
            case 'southEast':
                return {x: this.left + this.width, y: this.top + this.height}
            case 'middleRight':
                return {x: this.left + this.width, y: this.top + this.height / 2}
            case 'middleLeft':
                return {x: this.left, y: this.top + this.height / 2}
            case 'middleTop':
                return {x: this.left + this.width / 2, y: this.top}
            case 'middleBottom':
                return {x: this.left + this.width / 2, y: this.top + this.height}
            case 'center':
                return {x: this.left + this.width / 2, y: this.top + this.height / 2}
        }
        console.log("WERIDDDDDDDDDD")
    }
    deselect() {
        this.isSelected = false
    }
}

class RuleModel {
    constructor(input, output, outputMin, outputMax) {
        this.input = input;
        this.output = output;
        this.outputMin = outputMin;
        this.outputMax = outputMax;
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
    shouldKeepApplying(oldOutputValue,newOutputValue) {
        let isBiggerThan = true, isSmallerThan = true
        if (outputMin) {
            isBiggerThan = newOutputValue >= globalShapeDictionary[outputMin.shapeId][outputMin.property]
        }
        if (outputMax) {
            isSmallerThan = newOutputValue <= globalShapeDictionary[outputMax.shapeId][outputMax.property]
        }
        return isBiggerThan && isSmallerThan
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
            case 'translation':
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
            case 'scaling':
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

        if (!touch) {
            console.log("TouchInput >> applyNewInput: there isn't a touch = "+touch)
        }
        if (this.axis.length > aRule.output.axis.length) {
            console.log("Fatal error: there are more input axis than output axis on this rule: " + aRule)
            abort()
        }

        let delta = { x: 0, y: 0 }
        if (this.property == 'translation') {
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
        let result = this.measureFunction(newEvent)
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