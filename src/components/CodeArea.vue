<template>
    <div id="codeArea" class="codeArea">
      <editor v-model="content" @init="editorInit" lang="javascript" theme="chrome" width="100%" height="500"></editor>

        <div class="columns">
            <div class="column stateColumn" v-for="eachState in states">
              {{ eachState.name }}
              <br/>
              <label>Guard---</label>
              <textarea v-model="eachState.guard"></textarea>
              <br/>
              <label>Actions--</label>
              <textarea v-model="eachState.actions"></textarea>
              <br/>
              <label>To states</label>
              <textarea v-model="eachState.to"></textarea>


            </div>
        </div>
    </div>
</template>

<script>
import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore, globalBus, RulePlaceholderModel, State} from '../store.js'

export default {
    name: 'code-area',
    data: function() {
        return {
            states: [ new State("began"),new State("changed"),new State("ended")],
            content:
`var stateMachine = {
    shape1: function() {
        return mobileCanvasVM.shapeFor("S1")
    },

    touch1: function(event) {
        return event.touches[0]
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
            let shapito1 = this.shape1()
            let touchito1 = this.touch1(event)
            shapito1.left += event.info.delta.x
            shapito1.top += event.info.delta.y
        },
        changeColorShape1: function(event) {
            this.shape1().color = '#ff0000'
        },
        aGuard: function(event) {
            return true
        },
        isTouch1InsideShape1: function(event) {
            return this.isInside(this.touch1(event),this.shape1())
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
        editor:require('vue2-ace-editor')
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
    width: 70%;
}

.stateColumn {
    width: 200px;
}
</style>