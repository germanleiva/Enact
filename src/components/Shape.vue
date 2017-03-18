<template>
    <div :id="shapeModel.id" v-bind:style="styleObject" v-on:mousedown="mouseDownStartedOnShape" v-on:mouseover.prevent="isHovered = true" v-on:mouseout.prevent="isHovered = false" v-on:drop="dropForShape" v-on:dragover="dragOverForShape" v-on:dragenter="shapeModel.highlight = true" v-on:dragleave="shapeModel.highlight = false" v-show="!isTestShape || !testResult">
        <div v-show="shapeModel.highlight" v-bind:style="overlayStyleObject">
        </div>
        <div ref="handlerElements" v-for="eachHandler in handlers" v-if="shouldShowHandlers" :id="eachHandler.namePrefix + '-' + shapeModel.id" :style="handlerStyleObject(eachHandler)" @mousedown="mouseDownStartedOnHandler">
        </div>
        <div ref="relevantPointsElements" v-for="eachRelevantPoint in shapeModel.relevantPoints" v-if="shouldShowPoints" v-show="isHovered" :id="eachRelevantPoint.namePrefix + '-' + shapeModel.id" :style="relevantPointStyleObject(eachRelevantPoint)" @mousedown="mouseDownStartedOnRelevantPoint($event,eachRelevantPoint)">
        </div>
        <div :style="positionStyleObject" v-show="shapeModel.isMoving">
            <div :style="positionYStyleObject">{{shapeModel.top}}px</div>
            <div :style="positionXStyleObject">{{shapeModel.left}}px</div>
        </div>
        <div style="position:absolute;top:100%;left:50%;width:40px;margin-left:-20px;z-index:999" v-show="shapeModel.isResizing">{{shapeModel.width}}px</div>
        <div style="position:absolute;top:50%;height:30px;margin-top:-15px;right:-50px;z-index:999" v-show="shapeModel.isResizing">{{shapeModel.height}}px</div>
    </div>

</template>
<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import Vue from 'vue'
import Distance from './Distance.vue'
import {globalStore,globalBus,logger, MeasureModel, DiffModel} from '../store.js'

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
    name: 'shape',
    props: ['shapeModel', 'parentVisualState','isTestShape'],
    data: function() {
        return {
            visualState: this.parentVisualState,
            handlers: this.shapeModel.handlers,
            isHovered: false,
            isMoving: false
        }
    },
    computed: {
        shouldShowHandlers: function() {
            return !this.isTestShape && this.shapeModel.isSelected
        },
        shouldShowPoints: function() {
            return !this.isTestShape && globalStore.toolbarState.measureMode
        },
        styleObject: function() {
                return {
                    'backgroundColor': this.isTestShape? 'rgba(0,0,0,0)': this.shapeModel.color,
                    'position': 'absolute',
                    'left': this.shapeModel.left + 'px',
                    'top': this.shapeModel.top + 'px',
                    'width': this.shapeModel.width /*+ border*/ + 'px',
                    'height': this.shapeModel.height /*+ border*/ + 'px',
                    'border': this.isTestShape? '2px dashed #ffa500':'1px solid gray',
                    'overflow': 'visible',
                    'opacity': '1',
                    'pointer-events': this.isTestShape?'none':'auto'
                    // 'box-sizing': 'border-box' //To ignore the border size?
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
                'width': this.shapeModel.width + 'px',
                'height': this.shapeModel.height + 'px',
                'pointer-events':'none' //This is a hack to let the mouse event PASS-THROUGH the shape overlay
            }
        },
        testResult() {
            let myShape = this.parentVisualState.shapesDictionary[this.shapeModel.id]
            return myShape != undefined && myShape.testAgainst(this.shapeModel)
        }
    },
    destroyed: function() {
        console.log("WE DESTROYED SHAPE (the original props of this has: " + this.shapeModel.id +")")
    },
    watch: {
        styleObject: function(newVal,oldVal) {
            if (!this.isTestShape && this.shapeModel) {


                if (globalStore.visualStates[0] === this.visualState) {

                    let changes = {}
                    for (let eachKey in newVal) {
                        if (eachKey != "border" && newVal[eachKey] != oldVal[eachKey]) {
                            if (eachKey == 'backgroundColor' || eachKey == 'background-color') {
                                changes['color'] = newVal[eachKey]
                            } else {
                                changes[eachKey] = parseFloat(newVal[eachKey]) //Trimming the px from the string
                            }
                        }
                    }
                    // console.log("message-from-desktop EDIT_SHAPE")
                    globalStore.socket.emit('message-from-desktop', { type: "EDIT_SHAPE", id: this.shapeModel.id, message: changes })
               }
            } else {
                //I WAS DELETED
                console.log("Should i worry? " + this.shapeModel)
            }
        }
    },
    methods: {
        handlerStyleObject: function(aHandler) {
            const size = 10
            return {
                'left': aHandler.left(size) + 'px',
                'top': aHandler.top(size) + 'px',
                'width': size + 'px',
                'height': size + 'px',
                'background-color': '#ffffff',
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

            let handlerType = e.target.id.split('-')[0];

            let startingShapePositionXInWindowCoordinates = this.shapeModel.left + this.$parent.canvasOffsetLeft();
            let startingShapePositionYInWindowCoordinates = this.shapeModel.top + this.$parent.canvasOffsetTop();
            let startingShapeWidth = this.shapeModel.scale.w
            let startingShapeHeight = this.shapeModel.scale.h

            var mouseMoveHandler

            mouseMoveHandler = function(e) {
                this.shapeModel.isResizing = true;
                this.scalingChanged(e, handlerType, startingShapePositionXInWindowCoordinates, startingShapePositionYInWindowCoordinates, startingShapeWidth, startingShapeHeight);
            }.bind(this)
            let visualStateElement = this.$parent.canvasElement();
            visualStateElement.addEventListener('mousemove', mouseMoveHandler, false);

            var mouseUpHandler
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

                globalStore.toolbarState.linkingObject = this.shapeModel;

                var moveHandler = function(e) {
                    newMeasureModel.cachedFinalPosition.x = e.pageX
                    newMeasureModel.cachedFinalPosition.y = e.pageY
                }.bind(this);
                window.addEventListener('mousemove', moveHandler, false);

                var upHandler
                upHandler = function(e) {
                    // This handler should be trigger AFTER the rule upHandler"
                    globalStore.toolbarState.linkingObject = undefined;
                    newMeasureModel.deleteYourself();
                    window.document.body.removeChild(newDistanceVM.$el);
                    newDistanceVM.$destroy();
                    window.removeEventListener('mousemove', moveHandler, false);
                    window.removeEventListener('mouseup', upHandler, false);
                }.bind(this);
                window.addEventListener('mouseup', upHandler, false);

                return
            }

            if (globalStore.toolbarState.drawMode || globalStore.toolbarState.measureMode) {
                return
            }

            e.preventDefault();
            e.stopPropagation();

            if (!this.shapeModel.isSelected) {
                this.toggleSelection();
            }

            //Starting to move a shape
            let currentWindowMousePositionX = e.pageX;
            let currentWindowMousePositionY = e.pageY;
            var offsetX = currentWindowMousePositionX - this.shapeModel.left;
            var offsetY = currentWindowMousePositionY - this.shapeModel.top;

            // var parentElement = this.$el.parentNode;
            //When the second parameter is null in insertBefore the element is added as the last child
            // parentElement.insertBefore(this.$el, null);

            var moveHandler = function(e) {
                this.shapeModel.isMoving = true;
                this.moveChanged(e, offsetX, offsetY);
            }.bind(this);
            window.addEventListener('mousemove', moveHandler, false);

            var upHandler
            upHandler = function(e) {
                this.shapeModel.isMoving = false;
                window.removeEventListener('mousemove', moveHandler, false);
                window.removeEventListener('mouseup', upHandler, false);
            }.bind(this);
            window.addEventListener('mouseup', upHandler, false);
        },

        moveChanged: function(e, initialOffsetX, initialOffsetY) {
            let currentWindowMousePositionX = e.x;
            let currentWindowMousePositionY = e.y;

            let previousValue = { x: this.shapeModel.position.x, y: this.shapeModel.position.y };
            let newValue = {
                x: Math.min(Math.max(currentWindowMousePositionX - initialOffsetX, 0), this.visualState.maxWidth),
                y: Math.min(Math.max(currentWindowMousePositionY - initialOffsetY, 0), this.visualState.maxHeight)
            }
            logger('moveChanged');
            logger('previousValue: ' + JSON.stringify(previousValue));
            logger('newValue: ' + JSON.stringify(newValue));
            logger("---------");
            this.visualState.changeProperty(this.shapeModel,'translation',previousValue,newValue);
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

        scalingChanged(e, handlerType, startingShapePositionXInWindowCoordinates, startingShapePositionYInWindowCoordinates, startingShapeWidth, startingShapeHeight) {
            let previousValue = { w: this.shapeModel.scale.w, h: this.shapeModel.scale.h };

            let currentWindowMousePositionX = e.pageX;
            let currentWindowMousePositionY = e.pageY;

            // let currentShapePositionXInWindowCoordinates = this.shapeModel.left + this.visualState.canvasOffsetLeft();
            // let currentShapePositionYInWindowCoordinates = this.shapeModel.top + this.visualState.canvasOffsetTop();

            let newValue = {
                w: previousValue.w,
                h: previousValue.h,
            }
            this.shapeModel.isMoving = false;
            switch (handlerType) {
                case 'southEast':
                    if (currentWindowMousePositionX < startingShapePositionXInWindowCoordinates) {
                        //The currentWindowMousePositionX controls the startingShapePositionX
                        this.shapeModel.isMoving = true;
                        this.shapeModel.left = currentWindowMousePositionX - this.$parent.canvasOffsetLeft()
                    }
                    if (currentWindowMousePositionY < startingShapePositionYInWindowCoordinates) {
                        //The currentWindowMousePositionX controls the startingShapePositionX
                        this.shapeModel.isMoving = true;
                        this.shapeModel.top = currentWindowMousePositionY - this.$parent.canvasOffsetTop()
                    }
                    newValue.w = Math.abs(currentWindowMousePositionX - startingShapePositionXInWindowCoordinates);
                    newValue.h = Math.abs(currentWindowMousePositionY - startingShapePositionYInWindowCoordinates);
                    break;
                case 'southWest':
                    if (currentWindowMousePositionX < startingShapePositionXInWindowCoordinates + startingShapeWidth) {
                        let offsetX = startingShapePositionXInWindowCoordinates - currentWindowMousePositionX;

                        let startingShapePositionX = startingShapePositionXInWindowCoordinates - this.$parent.canvasOffsetLeft();
                        this.shapeModel.isMoving = true;
                        this.shapeModel.left = startingShapePositionX - offsetX;

                        newValue.w = startingShapeWidth + offsetX;
                    } else {
                        newValue.w = currentWindowMousePositionX - (this.shapeModel.left + this.$parent.canvasOffsetLeft());
                    }

                    if (currentWindowMousePositionY < startingShapePositionYInWindowCoordinates) {
                        let offsetY = startingShapePositionYInWindowCoordinates - currentWindowMousePositionY;
                        let startingShapePositionY = startingShapePositionYInWindowCoordinates - this.$parent.canvasOffsetTop();
                        this.shapeModel.isMoving = true;
                        this.shapeModel.top = startingShapePositionY - offsetY;

                        newValue.h = offsetY;

                    } else {
                        newValue.h = currentWindowMousePositionY - (this.shapeModel.top + this.$parent.canvasOffsetTop());
                    }

                    break;
                case 'northWest':
                    if (currentWindowMousePositionX < startingShapePositionXInWindowCoordinates + startingShapeWidth) {
                        this.shapeModel.isMoving = true;
                        this.shapeModel.left = currentWindowMousePositionX - this.$parent.canvasOffsetLeft();
                    }
                    newValue.w = Math.abs(currentWindowMousePositionX - (startingShapePositionXInWindowCoordinates + startingShapeWidth));

                    if (currentWindowMousePositionY < startingShapePositionYInWindowCoordinates + startingShapeHeight) {
                        this.shapeModel.isMoving = true;
                        this.shapeModel.top = currentWindowMousePositionY - this.$parent.canvasOffsetTop();
                    }

                    newValue.h = Math.abs(currentWindowMousePositionY - (startingShapePositionYInWindowCoordinates + startingShapeHeight));

                    break;
                case 'northEast':
                    if (currentWindowMousePositionX < startingShapePositionXInWindowCoordinates) {
                        this.shapeModel.isMoving = true;
                        this.shapeModel.left = (currentWindowMousePositionX - this.$parent.canvasOffsetLeft());
                    }
                    newValue.w = Math.abs(currentWindowMousePositionX - startingShapePositionXInWindowCoordinates);

                    if (currentWindowMousePositionY < startingShapePositionYInWindowCoordinates + startingShapeHeight) {
                        this.shapeModel.isMoving = true;
                        this.shapeModel.top = currentWindowMousePositionY - this.$parent.canvasOffsetTop();
                    }
                    newValue.h = Math.abs(currentWindowMousePositionY - (startingShapePositionYInWindowCoordinates + startingShapeHeight));

                    break;
            }

            if (this.shapeModel.isFollowingMaster('scaling') && previousValue.w == newValue.w && previousValue.h == newValue.h) {
                //Don't do anything, keep following master and do not propagate
            } else {
                this.shapeModel.width = newValue.w;
                this.shapeModel.height = newValue.h;
                if (this.visualState.nextState) {
                    this.visualState.nextState.somethingChangedPreviousState(this.shapeModel.id, previousValue, newValue, 'scaling');
                }
            }
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