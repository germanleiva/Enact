<template>
    <div id="codeArea" class="codeArea">
      <editor v-model="content" @init="editorInit" lang="javascript" theme="chrome" width="50%" height="350"></editor>
      <state-diagram :states="states" width="100%"></state-diagram>
    </div>
</template>

<script>
import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore, globalBus, RulePlaceholderModel, State} from '../store.js'
import StateDiagram from './StateDiagram.vue'

export default {
    name: 'code-area',
    data: function() {
        return {
            states: [
                { x: 43, y: 67, name: "Idle", isSelected: false, isHovered: false, transitions: [] },
                { x: 340, y: 150, name: "Change", isSelected: false, isHovered: false, transitions: [] },
                // { x: 200, y: 250, name: "End", isSelected: false, isHovered: false, transitions: [] },
                // { x: 300, y: 320, name: "fourth", isSelected: false, isHovered: false, transitions: [] },
                // { x: 50, y: 250, name: "fifth", isSelected: false, isHovered: false, transitions: [] },
                // { x: 90, y: 170, name: "last", isSelected: false, isHovered: false, transitions: [] }
            ],
            content:
`var stateMachine = {
    shape1: function() {
        return mobileCanvasVM.shapeFor("S1");
    },

    touch1: function(event) {
        return event.touches[0];
    },

    recordDelta: function(event) {
        var info = event.info;
        info.delta = {
            x: info.cur.x - info.prev.x,
            y: info.cur.y - info.prev.y,
            t: info.cur.t - info.prev.t
        }
    },
    isInside: function(touch, shape) {
        return shape.left < touch.pageX && shape.top < touch.pageY && shape.left + shape.width > touch.pageX && shape.top + shape.height > touch.pageY;
    },

    actions: {
        moveShape1: function(event) {
            this.shape1().color = '#00ff00'
            this.recordDelta(event);
            this.shape1().left += this.touch1(event).info.delta.x;
            this.shape1().top += this.touch1(event).info.delta.y;
        },
        changeColorShape1: function(event) {
            this.shape1().color = '#ff0000';
        },
        aGuard: function(event) {
            return true;
        },
        isTouch1InsideShape1: function(event) {
            return this.isInside(this.touch1(event),this.shape1());
        }
    },

    states: {
        idle: {
            on_touchstart: 'isTouch1InsideShape1 ? -> moving'
        },

        moving: {
            on_touchmove: 'moveShape1 -> moving',
            on_touchend: 'changeColorShape1 -> idle',
        }
    }
}`
        }
    },
    components: {
        editor:require('vue2-ace-editor'),
        StateDiagram
    },
    methods: {
        editorInit:function(editor) {
            // require('brace/mode/html');
            require('brace/mode/javascript');
            // require('brace/mode/less');
            require('brace/theme/chrome');
            editor.getSession().setUseWrapMode(true)
        }
        // addNewRule() {
        //     globalStore.ruleCounter++;
        //     var newRulePlaceholder = new RulePlaceholderModel(globalStore.ruleCounter)

        //     globalStore.rulesPlaceholders.push(newRulePlaceholder);

        //     globalStore.socket.emit('message-from-desktop', { type: "NEW_RULE", message: newRulePlaceholder.toJSON() })
        // }
    },
    computed: {
        // rulesPlaceholders: function() {
        //     return globalStore.rulesPlaceholders
        // }

    },
    mounted: function() {
        this.states[0].transitions.push({ id:1, name: 'touchstart', target: this.states[1] });
        this.states[1].transitions.push({ id:2, name: 'touchmove', target: this.states[1] });
        this.states[1].transitions.push({ id:3, name: 'touchend', target: this.states[0] });
    }
}
</script>

<style>
.codeArea {
/*    width: 100%;
    background-color: #eeeeee;
    display: flex;
    flex-wrap: wrap;
    align-content:flex-start;*/
    /*width: 70%;*/
    display:flex;
}

.stateColumn {
    width: 200px;
}
</style>