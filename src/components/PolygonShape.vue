<template>
    <div>
        <svg ref="parentSVG" :style="svgStyle" width="1" height="1">
            <path ref="svgPolygonPath" :id="shapeModel.id" v-bind:style="styleObject" :d="pathData" :transform="pathTransform" v-on:mousedown="mouseDownStartedOnShape" v-on:mouseover.prevent="isHovered = true" v-on:mouseout.prevent="isHovered = false" v-on:drop="dropForShape" v-on:dragover="dragOverForShape" v-on:dragenter="shapeModel.highlight = true" v-on:dragleave="shapeModel.highlight = false" v-show="!isTestShape || !testResult"/>
            <path :d="pathData" :transform="pathTransform" v-show="shapeModel.highlight" v-bind:style="overlayStyleObject"/>
        </svg>
        <div ref="handlerElements" v-for="eachHandler in shapeModel.handlers" v-if="shouldShowHandlers || eachHandler.highlight" :id="eachHandler.namePrefix + '-' + shapeModel.id" :style="handlerStyleObject(eachHandler)" @mousedown="mouseDownStartedOnHandler"></div>
    </div>
<!--           <div ref="relevantPointsElements" v-for="eachRelevantPoint in shapeModel.relevantPoints" v-if="shouldShowPoints" v-show="isHovered" :id="eachRelevantPoint.namePrefix + '-' + shapeModel.id" :style="relevantPointStyleObject(eachRelevantPoint)" @mousedown="mouseDownStartedOnRelevantPoint($event,eachRelevantPoint)">
          </div> -->

</template>
<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import Vue from 'vue'
import Distance from './Distance.vue'
import {globalStore,globalBus,logger, MeasureModel, DiffModel, ObjectLink} from '../store.js'

// class Handler {
//     constructor(namePrefix, left, top, right, bottom) {
//         this.namePrefix = namePrefix;
//         this.left = left;
//         this.top = top;
//         this.right = right;
//         this.bottom = bottom;
//     }
//     get styleObject() {
//         var result = {}
//         if (this.left != 0) {
//             result.left = this.left + 'px';
//         }
//         if (this.top != 0) {
//             result.top = this.top + 'px';
//         }
//         if (this.right != 0) {
//             result.right = this.right + 'px';
//         }
//         if (this.bottom != 0) {
//             result.bottom = this.bottom + 'px';
//         }
//         return result;
//     }
// }

export default {
    name: 'polygon-shape',
    props: ['shapeModel', 'parentVisualState','isTestShape'],
    data: function() {
        return {
            visualState: this.parentVisualState,
            isHovered: false,
            isMoving: false
        }
    },
    computed: {
        pathData: function() {
            let dataString = ""
            if (this.shapeModel.amountOfVertices > 0) {
                dataString += `M${this.shapeModel.vertexFor(0).x} ${this.shapeModel.vertexFor(0).y} `
                for (let i = 1; i < this.shapeModel.amountOfVertices; i++) {
                    let otherVertex = this.shapeModel.vertexFor(i)
                    dataString += `L ${otherVertex.x} ${otherVertex.y} `
                }
                dataString += "Z"
            }
            return dataString
        },
        pathTransform: function() {
            return 'translate('+this.shapeModel.position.x+','+this.shapeModel.position.y+')'
        },
        svgStyle: function() {
            return {
                'position' : 'absolute',
                'left': '0px',
                'top': '0px',
                'overflow': 'visible'
            }
        },
        shouldShowHandlers: function() {
            return !this.isTestShape && this.shapeModel.isSelected
        },
        shouldShowPoints: function() {
            return !this.isTestShape && globalStore.toolbarState.measureMode
        },
        styleObject: function() {
            return {
                'fill': this.isTestShape? 'rgba(0,0,0,0)': this.shapeModel.color,
                'stroke': this.isTestShape? '#ffa500':'gray',
                'stroke-width' : this.isTestShape ? "2" : "1",
                'stroke-dasharray' : this.isTestShape? "5,5":"none",
                'fill-opacity': '1',
                'pointer-events': this.isTestShape?'none':'auto'
            }
        },
        positionStyleObject: function() {
            return {
                'position':'absolute',
                'top': -this.shapeModel.top + 'px',
                'left': -this.shapeModel.left + 'px',
                'width': this.shapeModel.left + 'px',
                'height': this.shapeModel.top + 'px',
                'border-right': '1px black dotted',
                'border-bottom': '1px black dotted',
                'text-align': 'center',
                'z-index': 999
            }
        },
        positionXStyleObject: function() {
            return {
                'position':'absolute',
                'left': this.shapeModel.left / 2 + 'px',
                'top': this.shapeModel.top + 'px',
                'z-index':999
            }
        },
        positionYStyleObject: function() {
            return {
                'position':'absolute',
                'top': this.shapeModel.top / 2 + 'px',
                'left': this.shapeModel.left + 'px',
                'z-index':999
            }
        },
        overlayStyleObject: function() {
            return {
                'backgroundColor':'gray',
                'opacity':0.3,
                'pointer-events':'none' //This is a hack to let the mouse event PASS-THROUGH the shape overlay
            }
        },
        testResult() {
            let myShape = this.parentVisualState.shapesDictionary[this.shapeModel.id]
            return myShape != undefined && myShape.testAgainst(this.shapeModel)
        }
    },
    destroyed: function() {
        console.log("WE DESTROYED POLYGON (the original props of this has: " + this.shapeModel.id +")")
    },
    watch: {
        shapeModel: {
            deep:true,
            handler: function(newVal,oldVal) {
            if (!this.isTestShape) {
                if (globalStore.visualStates[0] === this.visualState) {

        //             let changes = {}
        //             for (let eachKey in newVal) {
        //                 if (eachKey != "border" && newVal[eachKey] != oldVal[eachKey]) {
        //                     if (eachKey == 'backgroundColor' || eachKey == 'background-color') {
        //                         changes['color'] = newVal[eachKey]
        //                     } else {
        //                         changes[eachKey] = parseFloat(newVal[eachKey]) //Trimming the px from the string
        //                     }
        //                 }
        //             }
                    console.log("message-from-desktop EDIT_SHAPE")
                    globalStore.socket.emit('message-from-desktop', { type: "EDIT_SHAPE", id: newVal.id, message: newVal.toJSON() })
               }
            } else {
                //I WAS DELETED
                console.log("Should i worry? Polygon shapeModel watcher")
            }
        }
    }
    },
    methods: {
        isPointInside(x,y) {
            let element = document.elementFromPoint(x,y)
            debugger;
        },
        handlerStyleObject: function(aHandler) {
            const size = 10
            return {
                'left': aHandler.left(this.shapeModel) - size / 2 +  'px',
                'top': aHandler.top(this.shapeModel) - size / 2 + 'px',
                'width': size + 'px',
                'height': size + 'px',
                'background-color': aHandler.highlight?'#ff0000':'#ffffff',
                'border': '1px solid #000000',
                'position':'absolute',
            }
        },
        relevantPointStyleObject: function(aPoint) {
            const size = 10;
            return {
                'position':'absolute',
                'border-radius': '50%',
                'left': aPoint.left(size) + 'px',
                'top': aPoint.top(size) + 'px',
                'width': size+'px',
                'height': size+'px',
                'background-color': 'red'
            }
        },
        handlerFor(x,y) {
            for(let eachHandlerDOMElement of this.$refs.relevantPointsElements) {
                let isInside = x > this.shapeModel.left + eachHandlerDOMElement.offsetLeft && x < this.shapeModel.left + eachHandlerDOMElement.offsetLeft + eachHandlerDOMElement.offsetWidth && y > this.shapeModel.top + eachHandlerDOMElement.offsetTop && y < this.shapeModel.top + eachHandlerDOMElement.offsetTop + eachHandlerDOMElement.offsetHeight
                if (isInside) {
                    return {type:'shape',id: this.shapeModel.id, handler: eachHandlerDOMElement.getAttribute('id').split('-')[0]}
                }
            }
            return undefined
        },
        mouseDownStartedOnRelevantPoint(e,aRelevantPoint) {
            if (globalStore.toolbarState.measureMode) {
                this.measureStartedOnRelevantPoint(e,aRelevantPoint,'shape',this.shapeModel.id)
            } else {
                console.log("THIS SHOULD NEVER HAPPEN")
            }
        },
        measureStartedOnRelevantPoint(e,aRelevantPoint,fromType,fromId) {
            this.$parent.measureStartedOnRelevantPoint(e,aRelevantPoint,fromType,fromId)
        },
        mouseDownStartedOnHandler(e) {
            e.preventDefault();
            e.stopPropagation();

            let vertexIndex = parseInt(e.target.id.split('-')[0]);

            let previousMousePosition = {x: e.pageX, y: e.pageY}

            let mouseMoveHandler

            mouseMoveHandler = function(e) {
                this.shapeModel.isResizing = true;
                let deltaX = e.pageX - previousMousePosition.x
                let deltaY = e.pageY - previousMousePosition.y

                let movedVertex = this.shapeModel.vertexFor(vertexIndex)
                let previousValue = {x: movedVertex.x, y: movedVertex.y}
                let newValue = {x: previousValue.x + deltaX, y: previousValue.y + deltaY}
                previousMousePosition.x = e.pageX
                previousMousePosition.y = e.pageY

                this.visualState.changeProperty(this.shapeModel,vertexIndex,previousValue,newValue)

            }.bind(this)
            let visualStateElement = this.$parent.canvasElement();
            visualStateElement.addEventListener('mousemove', mouseMoveHandler, false);

            let mouseUpHandler
            mouseUpHandler = function(e) {
                this.shapeModel.isResizing = false;
                this.shapeModel.isMoving = false;
                visualStateElement.removeEventListener('mousemove', mouseMoveHandler, false);
                visualStateElement.removeEventListener('mouseup', mouseUpHandler, false);
            }.bind(this)
            visualStateElement.addEventListener('mouseup', mouseUpHandler, false);
        },
        mouseDownStartedOnShape(e) {
            if (this.isTestShape) {
                return
            }

            if (e.ctrlKey) {
                e.preventDefault()
                e.stopPropagation();

                //Let's draw a line to the rule, we can create a measure from this point to the mouse
                let newMeasureModel = new MeasureModel(this.parentVisualState,{type:'shape',id:this.shapeModel.id,handler:undefined})
                newMeasureModel.cachedInitialPosition = {x:e.pageX,y:e.pageY}
                newMeasureModel.cachedFinalPosition = {x:e.pageX,y:e.pageY}

                const DistanceVM = Vue.extend(Distance);
                let newDistanceVM = new DistanceVM({propsData: {measureModel: newMeasureModel , isLink: true}})
                newDistanceVM.measureColor = 'black';
                newDistanceVM.$mount()
                window.document.body.appendChild(newDistanceVM.$el);

                globalStore.currentLink = new ObjectLink({visualState:this.parentVisualState,object:this.shapeModel})

                let moveHandler = function(e) {
                    newMeasureModel.cachedFinalPosition.x = e.pageX
                    newMeasureModel.cachedFinalPosition.y = e.pageY
                    globalStore.currentLink.toggleObjectLink(true)
                }.bind(this);
                window.addEventListener('mousemove', moveHandler, false);

                let upHandler
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

                return
            }

            if (globalStore.isDrawMode || globalStore.toolbarState.measureMode) {
                return
            }

            e.preventDefault();
            e.stopPropagation();

            if (!this.shapeModel.isSelected) {
                this.toggleSelection();
            }
            //Starting to move a shape
            let previousPosition = {x:e.pageX,y:e.pageY}

            // let boundingBox = this.$refs.parentSVG.getBBox()

            let moveHandler = function(e) {
                this.shapeModel.isMoving = true;
                this.moveChanged(e, previousPosition);
                previousPosition.x = e.pageX
                previousPosition.y = e.pageY;

            }.bind(this);
            window.addEventListener('mousemove', moveHandler, false);

            let upHandler
            upHandler = function(e) {
                this.shapeModel.isMoving = false;
                window.removeEventListener('mousemove', moveHandler, false);
                window.removeEventListener('mouseup', upHandler, false);
            }.bind(this);
            window.addEventListener('mouseup', upHandler, false);
        },

        moveChanged: function(e, aPreviousPosition) {
            let currentWindowMousePositionX = e.pageX;
            let currentWindowMousePositionY = e.pageY;

            let previousValue = { x: this.shapeModel.position.x, y: this.shapeModel.position.y };
            let newValue = {
                x: previousValue.x + (e.pageX - aPreviousPosition.x),
                y: previousValue.y + (e.pageY - aPreviousPosition.y)
            }

            //Snap to testShapes or previous state value
            let shapesToSnap = [...this.visualState.testShapes]

            // if (this.visualState.previousState) {
            //     let previousShape = this.visualState.previousState.shapeFor(this.shapeModel.id)
            //     if (previousShape) {
            //         shapesToSnap.push(previousShape)
            //     }
            // }

            for (let testShape of shapesToSnap) {
                if (Math.abs(newValue.x - testShape.position.x) < 5) {
                    newValue.x = testShape.position.x
                }
                if (Math.abs(newValue.y - testShape.position.y) < 5) {
                    newValue.y = testShape.position.y
                }
            }

            logger('moveChanged');
            logger('previousValue: ' + JSON.stringify(previousValue));
            logger('newValue: ' + JSON.stringify(newValue));
            logger("---------");
            this.visualState.changeProperty(this.shapeModel,'position',previousValue,newValue);
        },
        toggleSelection(notify = true) {
            this.shapeModel.isSelected = !this.shapeModel.isSelected;
            if (this.shapeModel.isSelected && notify) {
                globalBus.$emit('didSelectShapeVM', this);
            }
        },
        deselect() {
            this.shapeModel.deselect()
        },
        draggedTypeFor(dataTransfer) {
            const acceptedTypes = ["text/diff-shape","text/diff-touch"];
            let receivedTypes = [...dataTransfer.types]
            for (let acceptedType of acceptedTypes) {
                for (let receivedType of receivedTypes) {
                    if (acceptedType == receivedType) {
                        return acceptedType
                    }
                }
            }
            return undefined
        },
        dropForShape(event) {
            event.preventDefault();
            let dataType = this.draggedTypeFor(event.dataTransfer)
            let data = event.dataTransfer.getData(dataType)
            if (data) {
                console.log("dropForShape >> " + data)
                let diffModel = new DiffModel(JSON.parse(data))

                diffModel.applyDelta(this.visualState,this.shapeModel)
                this.shapeModel.highlight = false
            } else {
                console.log("WEIRD, we accepted the drop but there is no data for us =(")
            }
        },
        dragOverForShape(event) {
            console.log("dragOverForShape >> " + event.dataTransfer.types)
            if (this.draggedTypeFor(event.dataTransfer)) {
                this.shapeModel.highlight = true
                event.preventDefault()
            }
        }
    }
}
</script>
<style>

<style>