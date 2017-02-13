<template>
    <div :id="shapeModelId" v-bind:style="styleObject" v-on:mousedown="mouseDownStartedOnShape">
        <div v-for="eachHandler in handlers" v-if="isSelected" class="shapeHandler" :id="eachHandler.namePrefix + shapeModelId" :style="eachHandler.styleObject" @mousedown="mouseDownStartedOnHandler">
        </div>
    </div>
</template>
<script>

import Vue from 'vue'
import {globalStore,globalBus,logger} from '../store.js'

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

export default {
    name: 'shape',
    props: ['shapeModelId', 'parentVisualState'],
    data: function() {
        return {
            visualState: this.parentVisualState,
            isSelected: false,
            handlers: [new Handler('nw', -6, -6, 0, 0), new Handler('ne', 0, -6, -6, 0), new Handler('se', 0, 0, -6, -6), new Handler('sw', -6, 0, 0, -6)] //L T R B
        }
    },
    computed: {
        styleObject: function() {

            // if (this.shapeModel()) {
                return {
                    'backgroundColor': this.shapeModel().color,
                    'position': 'absolute',
                    'left': this.shapeModel().left + 'px',
                    'top': this.shapeModel().top + 'px',
                    'width': this.shapeModel().width + 'px',
                    'height': this.shapeModel().height + 'px',
                    'border': (this.isSelected ? '4px' : '1px') + ' solid gray',
                    'overflow': 'visible',
                    'opacity': '1'
                }
            // } else {
                // console.log("shapeModel() was undefined in " + this + " with shapeModelId " + this.shapeModelId)
            // return {}
            // }
        }
    },
    destroyed: function() {
        console.log("WE DESTROYED SHAPE (the original props of this has: " + this.shapeModelId +")")
    },
    watch: {
        styleObject: function(val) {
            if (this.shapeModel()) {
                // console.log("IN COMPUTED styleObject the shapeModel().color is "+ this.shapeModel().color)

                if (globalStore.visualStates[0] === this.visualState) {
                    globalStore.socket.emit('message-from-desktop', { type: "EDIT_SHAPE", message: { id: this.shapeModel().id, color: this.shapeModel().color, width: this.shapeModel().width, height: this.shapeModel().height, top: this.shapeModel().top, left: this.shapeModel().left, opacity: this.shapeModel().opacity } })
               }
            } else {
                //I WAS DELETED
                console.log("Should i worry? " + this.shapeModelId)
            }
        }
    },
    methods: {
        shapeModel(){
            return this.parentVisualState.shapesDictionary[this.shapeModelId]
        },
        mouseDownStartedOnHandler(e) {
            if (!this.isSelected) {
                console.log("THIS SHOULD NEVER HAPPEN")
                return
            }
            e.preventDefault();
            e.stopPropagation();

            let startingShapePositionXInWindowCoordinates = this.shapeModel().left + this.$parent.canvasOffsetLeft();
            let startingShapePositionYInWindowCoordinates = this.shapeModel().top + this.$parent.canvasOffsetTop();
            let startingShapeWidth = this.shapeModel().scale.w
            let startingShapeHeight = this.shapeModel().scale.h

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
            var offsetX = currentWindowMousePositionX - this.shapeModel().left;
            var offsetY = currentWindowMousePositionY - this.shapeModel().top;

            // var parentElement = this.$el.parentNode;
            //When the second parameter is null in insertBefore the element is added as the last child
            // parentElement.insertBefore(this.$el, null);

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

            let previousValue = { x: this.shapeModel().position.x, y: this.shapeModel().position.y };
            let newValue = {
                x: Math.min(Math.max(currentWindowMousePositionX - initialOffsetX, 0), this.visualState.maxWidth),
                y: Math.min(Math.max(currentWindowMousePositionY - initialOffsetY, 0), this.visualState.maxHeight)
            }
            logger('moveChanged');
            logger('previousValue: ' + JSON.stringify(previousValue));
            logger('newValue: ' + JSON.stringify(newValue));
            logger("---------");
            if (this.shapeModel().isFollowingMaster('translation') && previousValue.x == newValue.x && previousValue.y == newValue.y) {
                //Don't do anything, keep following master and do not propagate
            } else {
                this.shapeModel().left = newValue.x
                this.shapeModel().top = newValue.y
                if (this.visualState.nextState) {
                    this.visualState.nextState.somethingChangedPreviousState(this.shapeModel().id, previousValue, newValue, 'translation');
                }
            }
        },
        toggleSelection(notify = true) {
            this.isSelected = !this.isSelected;
            if (this.isSelected && notify) {
                globalBus.$emit('didSelectShapeVM', this);
            }
        },
        deselect() {
            if (this.isSelected) {
                this.isSelected = false;
            }
        },

        scalingChanged(e, handlerType, startingShapePositionXInWindowCoordinates, startingShapePositionYInWindowCoordinates, startingShapeWidth, startingShapeHeight) {
            let previousValue = { w: this.shapeModel().scale.w, h: this.shapeModel().scale.h };

            let currentWindowMousePositionX = e.x;
            let currentWindowMousePositionY = e.y;

            // let currentShapePositionXInWindowCoordinates = this.shapeModel().left + this.visualState.canvasOffsetLeft();
            // let currentShapePositionYInWindowCoordinates = this.shapeModel().top + this.visualState.canvasOffsetTop();

            let newValue = {
                w: previousValue.w,
                h: previousValue.h,
            }

            switch (handlerType) {
                case 'se':
                    if (currentWindowMousePositionX < startingShapePositionXInWindowCoordinates) {
                        //The currentWindowMousePositionX controls the startingShapePositionX
                        this.shapeModel().left = currentWindowMousePositionX - this.$parent.canvasOffsetLeft()
                    }
                    if (currentWindowMousePositionY < startingShapePositionYInWindowCoordinates) {
                        //The currentWindowMousePositionX controls the startingShapePositionX
                        this.shapeModel().top = currentWindowMousePositionY - this.$parent.canvasOffsetTop()
                    }
                    newValue.w = Math.abs(currentWindowMousePositionX - startingShapePositionXInWindowCoordinates);
                    newValue.h = Math.abs(currentWindowMousePositionY - startingShapePositionYInWindowCoordinates);
                    break;
                case 'sw':

                    if (currentWindowMousePositionX < startingShapePositionXInWindowCoordinates + startingShapeWidth) {
                        let offsetX = startingShapePositionXInWindowCoordinates - currentWindowMousePositionX;

                        let startingShapePositionX = startingShapePositionXInWindowCoordinates - this.$parent.canvasOffsetLeft();
                        this.shapeModel().left = startingShapePositionX - offsetX;

                        newValue.w = startingShapeWidth + offsetX;
                    } else {
                        newValue.w = currentWindowMousePositionX - (this.shapeModel().left + this.$parent.canvasOffsetLeft());
                    }

                    if (currentWindowMousePositionY < startingShapePositionYInWindowCoordinates) {
                        let offsetY = startingShapePositionYInWindowCoordinates - currentWindowMousePositionY;
                        let startingShapePositionY = startingShapePositionYInWindowCoordinates - this.$parent.canvasOffsetTop();
                        this.shapeModel().top = startingShapePositionY - offsetY;

                        newValue.h = offsetY;

                    } else {
                        newValue.h = currentWindowMousePositionY - (this.shapeModel().top + this.$parent.canvasOffsetTop());
                    }

                    break;
                case 'nw':
                    if (currentWindowMousePositionX < startingShapePositionXInWindowCoordinates + startingShapeWidth) {
                        this.shapeModel().left = currentWindowMousePositionX - this.$parent.canvasOffsetLeft();
                    }
                    newValue.w = Math.abs(currentWindowMousePositionX - (startingShapePositionXInWindowCoordinates + startingShapeWidth));

                    if (currentWindowMousePositionY < startingShapePositionYInWindowCoordinates + startingShapeHeight) {
                        this.shapeModel().top = currentWindowMousePositionY - this.$parent.canvasOffsetTop();
                    }

                    newValue.h = Math.abs(currentWindowMousePositionY - (startingShapePositionYInWindowCoordinates + startingShapeHeight));

                    break;
                case 'ne':
                    if (currentWindowMousePositionX < startingShapePositionXInWindowCoordinates) {
                        this.shapeModel().left = (currentWindowMousePositionX - this.$parent.canvasOffsetLeft());
                    }
                    newValue.w = Math.abs(currentWindowMousePositionX - startingShapePositionXInWindowCoordinates);

                    if (currentWindowMousePositionY < startingShapePositionYInWindowCoordinates + startingShapeHeight) {
                        this.shapeModel().top = currentWindowMousePositionY - this.$parent.canvasOffsetTop();
                    }
                    newValue.h = Math.abs(currentWindowMousePositionY - (startingShapePositionYInWindowCoordinates + startingShapeHeight));

                    break;
            }

            if (this.shapeModel().isFollowingMaster('scaling') && previousValue.w == newValue.w && previousValue.h == newValue.h) {
                //Don't do anything, keep following master and do not propagate
            } else {
                this.shapeModel().width = newValue.w;
                this.shapeModel().height = newValue.h;
                if (this.visualState.nextState) {
                    this.visualState.nextState.somethingChangedPreviousState(this.shapeModel().id, previousValue, newValue, 'scaling');
                }
            }
        }
    }
}
</script>