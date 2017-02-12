<template>
    <div :id="'shape'+version.model.id" v-bind:style="styleObject" v-on:mousedown="mouseDownStartedOnShape" ><div v-for="eachHandler in handlers" v-if="isSelected" class="shapeHandler" :id="eachHandler.namePrefix + version.model.id" :style="eachHandler.styleObject" @mousedown="mouseDownStartedOnHandler"></div>
</template>
<script>

import {globalStore,logger} from '../store.js'

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
    props: ['shapeModel', 'parentVisualState'],
    template: ``,
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
}
</script>