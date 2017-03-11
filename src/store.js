// import Vue from 'vue';
// import Vuex from 'vuex';

// Vue.use(Vuex);

// export const store = new Vuex.Store({
//     state: {
//         visualStates: []
//         inputEvents: []
//     }
// });

import { extendArray } from './collections.js'
extendArray(Array);
import Vue from 'vue';
import io from 'socket.io-client';

let isLoggerActive = false;
let logger = function(text) {
    if (isLoggerActive) {
        console.log(text);
    }
}

export { VisualStateModel, ShapeModel, MeasureModel, RulePlaceholderModel, RuleModel, MeasureInput, TouchInput, ShapeOutputRule, logger }

export const globalBus = new Vue();

export const globalStore = new Vue({
    data: {
        visualStates: [],
        inputEvents: [],
        isRecording: false,
        shapeCounter: 0,
        measureCounter: 0,
        ruleCounter: 0,
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
        rulesPlaceholders: [],
        mobileWidth: 410, //iPhone 375 Nexus 5X 410
        mobileHeight: 660 //iPhone 667 Nexus 5X 660
    },
    computed: {
        socket() {
            //TODO check if putting this as a computed property is legit
            let newSocket = io.connect('http://localhost:3000')
            newSocket.on('message-from-device', function(data) {
                globalBus.$emit('message-from-device-'+data.type,data)
            });
            return newSocket
        }
    },
    methods: {
        deselectAllShapes() {
            for (let eachVisualState of this.visualStates) {
                eachVisualState.deselectShapes()
            }
        },
        insertVisualStateAfter(aShapeDictionary,previousVisualState) {
            var newVisualState = new VisualStateModel()

            for (let eachShapeKey in aShapeDictionary) {
                console.log("Iterating aShapeDicionary: " + eachShapeKey)
                let clonedShapeModel = newVisualState.addNewShape(eachShapeKey)

                let referenceShape = aShapeDictionary[eachShapeKey]
                clonedShapeModel.color = referenceShape.color
                clonedShapeModel.left = referenceShape.left
                clonedShapeModel.top = referenceShape.top
                clonedShapeModel.width = referenceShape.width
                clonedShapeModel.height = referenceShape.height
            }

            let previousVisualStateIndex = this.visualStates.indexOf(previousVisualState)
            let nextVisualState = previousVisualState.nextState

            // newVisualState.importMeasuresFrom(previousVisualState);

            //TODO DRY LOOK DOWN
            for (let previousShapeId in previousVisualState.shapesDictionary) {
                let aPreviousShape = previousVisualState.shapesDictionary[previousShapeId]
                let aNewShape = newVisualState.shapesDictionary[previousShapeId]
                if (aNewShape) {
                    for (let eachProperty of ['backgroundColor','translation','scaling']) {
                        let mapper = {'backgroundColor':'color','translation':'position','scaling':'scale'};

                        if (aPreviousShape.areEqualValues(eachProperty,aPreviousShape[mapper[eachProperty]],aNewShape[mapper[eachProperty]])) {
                            aNewShape.followMaster(eachProperty)
                        }
                    }
                    aNewShape.masterVersion = aPreviousShape
                }
            }

            previousVisualState.nextState = newVisualState
            newVisualState.previousState = previousVisualState

            if (nextVisualState) {
                //TODO DRY LOOK UP
                for (let nextShapeId in nextVisualState.shapesDictionary) {
                    let aNextShape = nextVisualState.shapesDictionary[nextShapeId]
                    let aNewShape = newVisualState.shapesDictionary[nextShapeId]

                    if (aNewShape) {
                        for (let eachProperty of ['backgroundColor','translation','scaling']) {
                        let mapper = {'backgroundColor':'color','translation':'position','scaling':'scale'};

                            if (aNextShape.areEqualValues(eachProperty,aNextShape[mapper[eachProperty]],aNewShape[mapper[eachProperty]])) {
                                aNextShape.followMaster(eachProperty)
                            }
                        }
                        aNextShape.masterVersion = aNewShape
                    }
                }

                newVisualState.nextState = nextVisualState
                nextVisualState.previousVisualState = newVisualState
            }

            this.visualStates.insert(previousVisualStateIndex+1,newVisualState)

            //TODO DRY
            let correspondingIndex = Math.floor(newVisualState.percentageInTimeline / 100 * (globalStore.inputEvents.length /*-1*/))
            newVisualState.currentInputEvent = globalStore.inputEvents[correspondingIndex]
        }
    }
    // watch: {
    //     visualStates: function(newValue,oldValue) {

    //     }
    // }
})

class MeasureModel {
    constructor(visualState, from, to, cachedFinalPosition) {
        this.visualState = visualState
        this.from = from // {type, id, handler}
        this.to = to ? to : { type: undefined, id: undefined, handler: undefined }
        this.cachedInitialPosition = undefined
        this.cachedFinalPosition = cachedFinalPosition
        this.highlight = false
        this._relevantPoints = [new RelevantPoint(this, 'center', 0.5, 0.5)];
        this.nameCount = -1
    }
    get name() {
        switch (this.type) {
            case "point":
                return "P"+this.nameCount
            case "distance":
                return "D"+this.nameCount
            default:
                console.log("Unrecognized nameCount for measure: "+ this.id);
        }
    }
    get type() {
        if (this.from.type == this.to.type && this.from.id == this.to.id && this.from.handler == this.to.handler) {
            return "point"
        }
        return "distance"
    }
    get relevantPoints() {
        if (this.type == "distance") {
            return this._relevantPoints
        }
        return []
    }
    get id() {
        let p3 = this.to.id,
            p4 = this.to.handler

        if (!p3) {
            p3 = ""
        }

        if (!p4) {
            p4 = ""
        }

        return this.from.id + "-" + this.from.handler + "-" + p3 + "-" + p4
    }
    get fromObject() {
        let fromId = this.from.id;
        switch (this.from.type) {
            case 'shape':
                return this.visualState.shapeFor(fromId)
            case 'distance':
                return this.visualState.distanceFor(fromId)
            default:
                console.log("Unrecognized 'from' type in MeasureModel: " + this.from.type)
        }
    }
    get toObject() {
        let toId = this.to.id;
        switch (this.to.type) {
            case 'shape':
                return this.visualState.shapeFor(toId)
            case 'distance':
                return this.visualState.distanceFor(toId)
            default:
                console.log("Unrecognized 'to' type in MeasureModel: " + this.to.type)
        }
    }
    get initialPoint() {
        if (this.cachedInitialPosition) {
            return this.cachedInitialPosition
        }
        return this.fromObject.positionOfHandler(this.from.handler)
    }
    get finalPoint() {
        if (this.to.id) {
            return this.toObject.positionOfHandler(this.to.handler)
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

        switch (this.type) {
            case "point": //I'm interested in translation
                if (this.initialPoint.x != this.finalPoint.x || this.initialPoint.y != this.finalPoint.y) {
                    console.log("WEIRD @ Point >> diffArray - the initialPoint and the finalPoint are not the same in a 'point measure'?")
                }
                if (nextMeasureWithTheSameModel.initialPoint.x != nextMeasureWithTheSameModel.finalPoint.x || nextMeasureWithTheSameModel.initialPoint.y != nextMeasureWithTheSameModel.finalPoint.y) {
                    console.log("WEIRD @ Point >> diffArray - the initialPoint and the finalPoint are not the same in a 'point measure' for my nextMeasureWithTheSameModel?")
                }
                let myOnlyPoint = this.initialPoint
                let hisOnlyPoint = nextMeasureWithTheSameModel.initialPoint

                if (myOnlyPoint.x == hisOnlyPoint.x && myOnlyPoint.y == hisOnlyPoint.y) {
                    //No diff in starting point
                } else {
                    changes.push({ id: this.name, type: 'measure', property: { name: "translation", before: myOnlyPoint, after: hisOnlyPoint } })
                }

                break;
            case "distance": //I'm interested in scaling
                if (this.width != nextMeasureWithTheSameModel.width || this.height != nextMeasureWithTheSameModel.height) {
                    changes.push({ id: this.name, type: 'measure', property: { name: "scaling", before: { w: this.width, h: this.height }, after: { w: nextMeasureWithTheSameModel.width, h: nextMeasureWithTheSameModel.height } } })
                }
                break;
        }

        return changes
    }
    positionOfHandler(handlerName) {
        if (handlerName == 'center') {
            return { x: this.initialPoint.x + (this.deltaX / 2), y: this.initialPoint.y + (this.deltaY / 2) }
        }
        console.log("WERIDDDDDDDDDD")
        abort()
    }
    deleteYourself() {
        let index = this.visualState.measures.indexOf(this)
        if (index >= 0) {
            this.visualState.measures.splice(index, 1)
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
    changeProperty(shapeModel,propertyName,previousValue,newValue) {
        if (shapeModel.isFollowingMaster('translation') && previousValue.x == newValue.x && previousValue.y == newValue.y) {
            //Don't do anything, keep following master and do not propagate
        } else {
            switch (propertyName) {
                case 'translation': {
                    shapeModel.left = newValue.x
                    shapeModel.top = newValue.y
                    break;
                }
            }
            if (this.nextState) {
                this.nextState.somethingChangedPreviousState(shapeModel.id, previousValue, newValue, propertyName);
            }
        }
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
    importMeasureUntilLastVisualState(previousMeasure) {
        switch (previousMeasure.from.type) {
            case "shape":
                for (let shapeKey in this.shapesDictionary) {
                    if (previousMeasure.from.id == shapeKey) {
                        //This VisualState has the starting Shape so we import the measure
                        return this.addNewMeasureUntilLastState(previousMeasure.from.type, previousMeasure.from.id, previousMeasure.from.handler, previousMeasure.to.type, previousMeasure.to.id, previousMeasure.to.handler, previousMeasure.cachedFinalPosition)
                    }
                }
                break;
            case "distance":
                for (let aMeasure of this.measures) {
                    if (previousMeasure.from.id == aMeasure.id) {
                        //This VisualState has the starting Shape so we import the measure
                        return this.addNewMeasureUntilLastState(previousMeasure.from.type, previousMeasure.from.id, previousMeasure.from.handler, previousMeasure.to.type, previousMeasure.to.id, previousMeasure.to.handler, previousMeasure.cachedFinalPosition)
                    }
                }
                break;
        }


        return []
    }

    addNewMeasureUntilLastState(fromEntityType, fromId, fromHandlerName, toEntityType, toId, toHandlerName, cachedFinalPosition) {
        let result = []
            //TODO check if it is ok to create the 'to' object when the toId and toHandler are undefined
        let newMeasure = new MeasureModel(this, { type: fromEntityType, id: fromId, handler: fromHandlerName }, { type: toEntityType, id: toId, handler: toHandlerName }, cachedFinalPosition)
        newMeasure.nameCount = globalStore.measureCounter++;
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
    addNewShape(shapeId,protoShape) {
        let correspondingVersion

        if (protoShape) {
            //Cheap way of cloning the version, and setting the masterVersion!
            correspondingVersion = new ShapeModel(shapeId, protoShape);
        } else {
            if (shapeId) {
                correspondingVersion = new ShapeModel(shapeId, undefined, 'white', 0, 0, 0, 0);
            } else {
                let newShapeCount = globalStore.shapeCounter++;
                correspondingVersion = new ShapeModel('R' + newShapeCount, undefined, 'white', 0, 0, 0, 0);
            }
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

        let ourNewlyCreatedShape = this.addNewShape(newlyCreatedShape.id,newlyCreatedShape);
        if (this.nextState) {
            this.nextState.didCreateShape(ourNewlyCreatedShape, this);
        }
    }
    shapeFor(aShapeKey) {
        return this.shapesDictionary[aShapeKey];
    }
    distanceFor(aMeasureKey) {
        return this.measures.find(x => x.id == aMeasureKey)
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

        let involvedMeasures = this.measures.filter(aMeasure => aMeasure.from.id == aShapeModel.id || aMeasure.to.id == aShapeModel.id)

        for (let anInvolvedMeasure of involvedMeasures) {
            console.log("We deleted the measure " + anInvolvedMeasure.id)
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

        Vue.delete(this.shapesDictionary, aShapeModel.id)
            // this.shapesDictionary[aShapeModel.id] = undefined


        if (globalStore.visualStates[0] === this) {
            globalStore.socket.emit('message-from-desktop', { type: "DELETE_SHAPE", message: { id: aShapeModel.id } })
        }
    }
    toggleHighlightForInvolvedElement(shapeOrMeasureId, aBoolean) {
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
    deselectShapes() {
        for (let eachShapeKey in this.shapesDictionary) {
            let eachShape = this.shapesDictionary[eachShapeKey]
            eachShape.deselect()
        }
    }
    selectedShapes() {
        let selected = []
        for (let eachShapeId in this.shapesDictionary) {
            let shape = this.shapesDictionary[eachShapeId]
            if (shape.isSelected) {
                selected.push(shape)
            }
        }
        return selected
    }
    moveSelectedShapes(deltaX,deltaY) {
        for (let eachSelectedShape of this.selectedShapes()) {
            this.changeProperty(eachSelectedShape,'translation',eachSelectedShape.position,{x:eachSelectedShape.left+deltaX,y:eachSelectedShape.top+deltaY})
        }
    }
    deleteSelectedShapes() {
        for (let shapeToDelete of this.selectedShapes()) {
            this.deleteShape(shapeToDelete)
        }
    }
}

class RelevantPoint {
    constructor(shapeOrMeasure, namePrefix, percentualX, percentualY) {
        this.shapeOrMeasure = shapeOrMeasure
        this.namePrefix = namePrefix;
        this.percentualX = percentualX;
        this.percentualY = percentualY;
        this.isHandler = [0, 1].includes(percentualX) && [0, 1].includes(percentualY)
        this.leftMargin = -6
        this.topMargin = -6
    }
    get left() {
        return this.shapeOrMeasure.width * this.percentualX + this.leftMargin
    }
    get top() {
        return this.shapeOrMeasure.height * this.percentualY + this.topMargin
    }
}

class ShapeModel {
    constructor(id, aMasterVersion, aColor = '', left = null, top = null, width = null, height = null) {
        this.id = id;
        this.name = id;

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

        this.relevantPoints = [new RelevantPoint(this, 'northWest', 0, 0), new RelevantPoint(this, 'northEast', 1, 0), new RelevantPoint(this, 'southEast', 1, 1), new RelevantPoint(this, 'southWest', 0, 1), new RelevantPoint(this, 'middleRight', 1, 0.5), new RelevantPoint(this, 'middleLeft', 0, 0.5), new RelevantPoint(this, 'middleTop', 0.5, 0), new RelevantPoint(this, 'middleBottom', 0.5, 1), new RelevantPoint(this, 'center', 0.5, 0.5)];
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
            'position:' + 'absolute' + ";" +
            'left:' + this.left + 'px' + ";" +
            'top:' + this.top + 'px' + ";" +
            'width:' + this.width + 'px' + ";" +
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
        if (!nextShapeWithTheSameModel.isFollowingMaster('backgroundColor') && !this.areEqualValues('backgroundColor', this.backgroundColor.value, nextShapeWithTheSameModel.backgroundColor.value)) {
            // changes.push('Changed color from ' + this.color + ' to ' + nextShapeWithTheSameModel.color)
            changes.push({ id: this.id, type: 'output', property: { name: "backgroundColor", before: this.color, after: nextShapeWithTheSameModel.color } })
        }
        if (!nextShapeWithTheSameModel.isFollowingMaster('translation') && !this.areEqualValues('translation', this.translation.value, nextShapeWithTheSameModel.translation.value)) {
            // changes.push('Changed position from ' + JSON.stringify(this.position) + ' to ' + JSON.stringify(nextShapeWithTheSameModel.position))
            changes.push({ id: this.id, type: 'output', property: { name: "translation", before: this.position, after: nextShapeWithTheSameModel.position } })
        }
        if (!nextShapeWithTheSameModel.isFollowingMaster('scaling') && !this.areEqualValues('scaling', this.scaling.value, nextShapeWithTheSameModel.scaling.value)) {
            // changes.push('Changed size from ' + JSON.stringify(this.scale) + ' to ' + JSON.stringify(nextShapeWithTheSameModel.scale))
            changes.push({ id: this.id, type: 'output', property: { name: "scaling", before: this.scale, after: nextShapeWithTheSameModel.scale } })
        }
        return changes
    }
    positionOfHandler(handlerName) {
        switch (handlerName) {
            case 'northEast':
                return { x: this.left + this.width, y: this.top }
            case 'northWest':
                return { x: this.left, y: this.top }
            case 'southWest':
                return { x: this.left, y: this.top + this.height }
            case 'southEast':
                return { x: this.left + this.width, y: this.top + this.height }
            case 'middleRight':
                return { x: this.left + this.width, y: this.top + this.height / 2 }
            case 'middleLeft':
                return { x: this.left, y: this.top + this.height / 2 }
            case 'middleTop':
                return { x: this.left + this.width / 2, y: this.top }
            case 'middleBottom':
                return { x: this.left + this.width / 2, y: this.top + this.height }
            case 'center':
                return { x: this.left + this.width / 2, y: this.top + this.height / 2 }
        }
        console.log("WERIDDDDDDDDDD")
    }
    deselect() {
        this.isSelected = false
    }
}

class RulePlaceholderModel {
    constructor(id) {
        this.id = id;
        this.input = { type: undefined, id: undefined, property: undefined, axiss: [], min: undefined, max: undefined };
        this.output = { type: undefined, id: undefined, property: undefined, axiss: [], min: undefined, max: undefined };
    }
}

class ShapeOutputRule {
    constructor(shapeId, property, axis) {
        this.id = shapeId;
        this.property = property;
        this.axis = axis;
        this.minValue = undefined;
        this.maxValue = undefined;
    }
    get minValue() {
        if (this._minValue) {
            return this._minValue
        }
        return { x: Number.MIN_VALUE, y: Number.MIN_VALUE }
    }
    set minValue(aValue) {
        this._minValue = aValue
    }
    get maxValue() {
        if (this._maxValue) {
            return this._maxValue
        }
        return { x: Number.MAX_VALUE, y: Number.MAX_VALUE }
    }
    set maxValue(aValue) {
        this._maxValue = aValue
    }
    shouldActivate() {
        return this.id != undefined && this.property != undefined && this.axis.length > 0
    }
}

class RuleModel {
    constructor(id, input, output) {
        this.id = id;
        this.input = input;
        if (output) {
            this.output = output;
        } else {
            this.output = new ShapeOutputRule(undefined,undefined,[])
        }

        this.enforce = true;
        this.currentOutput = undefined;
    }
    activate(anEvent, globalShapeDictionary) {
        if (this.input && this.input.shouldActivate(this, anEvent) && this.output.shouldActivate()) {
            //Does it affect one of the current shapes?
            let controlledShapeVM = globalShapeDictionary[this.output.id]
            if (controlledShapeVM) {
                // if (this.input.condition(event, controlledShape)) {
                this.currentEvent = anEvent
                this.currentOutput = controlledShapeVM.shapeModel
                this.input.activate()
                return true
                    // }
            }
        }
        return false
    }
    applyNewInput(newEvent, globalShapeDictionary) {
        // let touch = event.touches[0]
        this.input.applyNewInput(this, newEvent, globalShapeDictionary)
        this.currentEvent = newEvent

    }
    shouldKeepApplying(oldOutputValue, newOutputValue, anAxis, globalShapeDictionary) {
        return newOutputValue >= this.output.minValue[anAxis] && newOutputValue <= this.output.maxValue[anAxis]
    }
    actuallyApply(delta, newEvent, globalShapeDictionary) {
        if (!this.input.condition(newEvent, this.currentOutput, globalShapeDictionary)) {
            return
        }
        for (let i=0;i<this.output.axis.length;i++) {
            let eachOutputAxis = this.output.axis[i];
            let correspondingInputAxis = this.input.axis[i];
            if (!correspondingInputAxis) {
                console.log("the rule does not have an input axis defined for that output axis, but we assume that the first will be used")
                correspondingInputAxis = this.input.axis[0];
            }
            let outputProperty = ''
            let complementaryProperty = undefined

            switch (eachOutputAxis) {
                case 'x': {
                    switch (this.output.property) {
                        case 'center': {
                            outputProperty = 'centerX';
                            break;
                        }
                        case 'translation': {
                            outputProperty = 'left';
                            break;
                        }
                        case 'scaling': {
                            outputProperty = 'width';
                            // complementaryProperty = 'left';
                            break;
                        }
                        default: {
                            console.log("RuleModel >> actuallyApply: Axis " + eachOutputAxis + " | Unrecognized output property " + this.output.property)
                        }
                    }
                    break;
                }
                case 'y': {
                    switch (this.output.property) {
                        case 'center': {
                            outputProperty = 'centerY';
                            break;
                        }
                        case 'translation': {
                            outputProperty = 'top';
                            break;
                        }
                        case 'scaling': {
                            outputProperty = 'height';
                            // complementaryProperty = 'top'
                            break;
                        }
                        default: {
                            console.log("RuleModel >> actuallyApply: Axis " + eachOutputAxis + " | Unrecognized output property " + this.output.property)
                        }
                    }
                    break;
                }
                default: {
                    console.log("RuleModel >> actuallyApply: Unrecognized axis " + eachOutputAxis)
                }
            }
            let newValue = this.currentOutput[outputProperty] + delta[correspondingInputAxis]
            if (this.shouldKeepApplying(this.currentOutput[outputProperty], newValue, eachOutputAxis, globalShapeDictionary)) {
                this.currentOutput[outputProperty] = newValue
                if (complementaryProperty) {
                    this.currentOutput[complementaryProperty] = this.currentOutput[complementaryProperty] + delta[correspondingInputAxis] / 2
                }
            }
        }
    }
}

class InputRule {
    constructor() {
        this.minPosition = undefined;
        this.maxPosition = undefined;
    }
    get minPosition(){
        if (this._minPosition) {
            return this._minPosition
        }
        return { x: Number.MIN_VALUE, y: Number.MIN_VALUE }
    }
    set minPosition(newMinPosition){
        this._minPosition = newMinPosition
    }
    get maxPosition() {
        if (this._maxPosition) {
            return this._maxPosition
        }
        return { x: Number.MAX_VALUE, y: Number.MAX_VALUE }
    }
    set maxPosition(newMaxPosition){
        this._maxPosition = newMaxPosition
    }
}

class TouchInput extends InputRule {
    constructor(touchId, property, listOfAxis) {
        super()
        this.touchId = touchId
        this.property = property
        this.axis = listOfAxis
    }
    condition(event, aShape) {
        let touch = this.touchFor(event)
        return this.axis.every(eachAxis => touch['page' + eachAxis.toUpperCase()] >= this.minPosition[eachAxis] && touch['page' + eachAxis.toUpperCase()] <= this.maxPosition[eachAxis])
    }
    shouldActivate(aRule, anEvent) {
        //The event has the corresponding touch
        return this.touchId != undefined && anEvent.touches[this.touchId] != undefined && this.property != undefined && this.axis.length > 0
    }
    touchFor(event) {
        return event.touches[this.touchId]
    }
    applyNewInput(aRule, newEvent, globalShapeDictionary) {
        let previousTouch = aRule.currentEvent.touches[this.touchId]

        let touch = newEvent.touches[this.touchId]

        if (!touch) {
            console.log("TouchInput >> applyNewInput: there isn't a touch = " + touch)
        }
        if (this.axis.length > aRule.output.axis.length) {
            console.log("Fatal error TouchInput: there are more input axis than output axis on this rule: " + aRule)
            abort()
        }

        let delta = { x: 0, y: 0 }
        if (this.property == 'translation') {
            for (let eachInputAxis of this.axis) {
                delta[eachInputAxis] = touch['page' + eachInputAxis.toUpperCase()] - previousTouch['page' + eachInputAxis.toUpperCase()]
            }
        }

        aRule.actuallyApply(delta, newEvent, globalShapeDictionary)
    }
    activate() {

    }
}

class MeasureInput extends InputRule {
    constructor(measureObject, property, listOfAxis, previousValue) {
        super()
        this.measureObject = measureObject
        this.property = property
            // this.previousValue = {x:undefined,y:undefined}
        this.previousValue = previousValue
        this.axis = listOfAxis;
    }
    shouldActivate(aRule, anEvent) {
        //For now, the measure rules should be always active (maybe if the related shaped are not present this should be false)
        return this.measureObject != undefined && this.property != undefined && this.axis.length > 0;
    }
    condition(event, aShape) {
        return true;
    }
    applyNewInput(aRule, newEvent, globalShapeDictionary) {

        let newValue = this.currentMeasuredValue()

        if (this.axis.length > aRule.output.axis.length) {
            console.log("Fatal error MeasureInput: there are more input axis than output axis on this rule: " + aRule)
            abort()
        }

        let delta = { x: 0, y: 0 }
        for (let eachInputAxis of this.axis) {
            delta[eachInputAxis] = newValue[eachInputAxis] - this.previousValue[eachInputAxis]
            this.previousValue[eachInputAxis] = newValue[eachInputAxis]
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
        aRule.actuallyApply(delta, newEvent, globalShapeDictionary)
    }
    currentMeasuredValue() {
        switch(this.property) {
            case 'translation': {
                return this.measureObject.initialPoint
            }
            case 'scaling': {
                return {x:this.measureObject.width,y:this.measureObject.height}
            }
            default: {
                console.log("MeasureInput >> currentMeasuredValue, unrecognized property: "+this.property)
            }
        }
    }
    activate() {
        this.previousValue = this.currentMeasuredValue()
    }
}
