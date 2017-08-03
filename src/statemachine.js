export {StateMachine,logError,logSM,logEvent,logTouch,trim,log}
	// Logging function to trace the action
	var logging = true;
	function log(msg) {
		if (/*socket &&*/ logging) {
			// socket.emit("log", msg);
			console.log(msg)
		}
	}
	var logFilter = {
		Error:	true,
		SM:		false,
		Event:	false,
		Touch:	false,
	};
	function logError(msg)	{if (logFilter.Error) log ("*** "+msg)}
	function logSM(msg)		{ if (logFilter.SM) log(msg); }
	function logEvent(msg)	{ if (logFilter.Event) log(msg); }
	function logTouch(msg)	{ if (logFilter.Touch) log(msg); }

	// trim whitespace around a string
	function trim(str) {return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');}

	/** function StateMachine(description)
	Creates a state machine.'description' is an object containing:
		- local properties of the machine;
		- an optional property called 'actions', containing functions that may be called by the machine;
		- a property called 'states', containing a description of the states.
			Each state is itself an object, containing the description of the transitions.
				Each transition must be a property whose name starts with 'on'.
				A transition is an object holding the following optional properties:
					- A 'guard' property, holding a function called to decide if the transition should fire;
					- An 'action' property, holding a function to be called when the transition fires;
					- A 'to' property, holding the name of the destination state.
				A transition can also be an array of such objects, in which case they are tried in sequence
				until one fires (this is only useful when using guards).
			A state can also contain functions in their 'enter' and 'exit' properties
			these are called when that state becomes active and stops being active, respectively

	Actions and guards can be replaced by a string holding the name of a guard or action
	in the 'actions' property, making the transitions easier to read, e.g.:
		states: {
			...
			on_mouseup: {
				guard: function(event) {
					...
				}
				action: function(event) {
					...
				}
				to: 'start'
			}
		}
	becomes
		actions: {
			movedSome: function(event) {
				...
				},
			endDrag: function(event) {
				...
			}
		},
		states: {
			...
			drag: {
				on_mouseup: {
					guard: 'movedSome',
					action: 'endDrag',
					to: 'start',
				}
			}
		}

	Going one step further, a transition object can be replaced by a string of the form:
		'guard ? action -> to'
	where guard, action and to are the names of the guard, action and destination state.
	Each part is optional. If [] denotes an optional part, then the allowed syntax is:
		[guard ?] [action] [-> to]
	For the example above, we'd get
		states: {
			...
			drag: {
				on_mouseup: 'movedSome? endDrag -> start',
			}
		}

	Finally, enter and exit actions of a state can also be specified by the name of an action, e.g.:
		drag: {
			enter: 'drawShadow',
		}

	Note that if a transition does not specify a destination state (no property 'to'),
	the machine stays in the same state when the transition fires, but the enter and exit actions
	are not called. If you want these actions to be called, specify the 'to' property:
		drag: {
			enter: 'drawShadow',
			on_mousemove: 'doDrag',	// enter action not called
		}
	but
		drag: {
			enter: 'drawShadow',
			on_mousemove: 'doDrag -> drag',	// enter action called
		}
		}
	**/

	function StateMachine(description) {
		// First copy the description in the new object
		var machine = this;
		for (var property in description) {
			var value = description[property];
			this[property] = value;
		}

		// Then add the 'machine' property to each state,
		// and a 'machine' and 'state' property to each transition
		// Also add a 'name' property to states and transitions, unless one is defined
		for (var stateName in this.states) {
			var state = this.states[stateName];
			if (! this.firstState)
				this.firstState = state;
			state.machine = this;
			if (! state.name)
				state.name = stateName;

			// If the entry is not a string, return it.
			// If the entry is a string, return the value in the table
			// or throw an exception if it is not there
			function resolve(entry, table, message) {
				if (typeof entry != "string")
					return entry;
				var value = table[entry];
				if (value)
					return value;
				throw message+" undefined in state machine: "+entry;
			}

			// 'Compile' a transition:
			//		Analyze it if defined as a string,
			//		resolve the action and guard names if any,
			//		add the name, state and machine properties.
			function initTransition(transition, name) {
				if (typeof transition == 'string') {
					// parse 'guard ? action -> state' where each section is optional
					// (action must be present if guard is specified)
					var pattern = /^\s*(?:(\w+)\s*\?\s*)?(\w+)?(?:\s*->\s*(\w+))?\s*$/;
					var result = transition.match(pattern);
					transition = {};

					if (! result) throw "Incorrect transition in state machine: "+transition;
					if (result[1]) transition.guard = result[1];
					if (result[2]) transition.action = result[2];
					if (result[3]) transition.to = result[3];
				}

				if (! transition.name)
					transition.name = name;
				transition.state = state;
				transition.machine = machine;
				// resolve guard and action names to machine properties
				if (transition.action)
					transition.action = resolve(transition.action, machine.actions, "Action");
				if (transition.guard)
					transition.guard = resolve(transition.guard, machine.actions, "Guard")
				if (transition.to)
					transition.to = resolve(transition.to, machine.states, "State");

				return transition;
			}

			// 'Compile' a state:
			//		compile its transitions (identified by their 'on' prefix).
			//		compile the enter and exit actions, if any
			for (var transName in state) {
				if (! transName.indexOf('on') == 0)
					continue;

				var transitions = state[transName];
				if (typeof transitions == 'string' || ! transitions.length)
					state[transName] = initTransition(transitions, transName);
				else // case where we have a list of transitions
					for (var t = 0; i < transitions.length; t++)
						transitions[t] = initTransition(transitions[t], transName);
			}
			if (state.enter)
				state.enter = resolve(state.enter, machine.actions, "Enter action");
			if (state.exit)
				state.exit = resolve(state.exit, machine.actions, "Enter action");
		}

		// start machine in initial state
		this.currentState = this.firstState;
	}

	/** StateMachine::processEvent(type, event)
	Method called to run one step of the state machine.
	'type' is the type of transition to be fired,
	'event' is an arbitrary object passed to all the guards and actions.

	processEvent looks for a transition of the given type in the current state.
	If it finds one, it attempt to fire it by calling its guard, if any.
	If there is no guard or the guard returns true, it calls the exit action of the current state if any,
	the transition action if any, and the enter state of the destination state if any.
	(if a destination state is not specified, the machine stays in the same state
	and the enter and exit actions are not called).

	If the transition being considered is an array, its elements are tried in order until one fires
	or the array is exhausted.

	If a transition fired, processEvent returs true, in all other cases it returns false.

	If an error occurs in a guard or action, it is ignored and an error message is logged.
	This is achieved by calling the logError function, which can be redefined.

	The guard, enter, exit and transition actions are all called with 'this' set to the machine,
	and with three arguments: the event passed to processEvent, the transition that fired and the current state.
	This allows actions to easily access any information stored in the transition, state or machine.
	**/
	StateMachine.prototype.processEvent = function (type, event) {
		var machine = this;
		var state = this.currentState;

		if (! state)
			return false;

		var transitions = state['on_'+type];
		//logSM('processEvent '+type+' in state '+ state.name);
		if (! transitions) {
			logSM('['+state.name+'] -- '+type+' -> no transition');
			return false;
		}

		// This function fires a transition, returning true if it did,
		// false otherwise (i.e. if a guard returned false or failed)
		function processTransition(transition) {
			// call the guard, if any
			if (transition.guard)
			 	try {
					if (! transition.guard.call(machine, event, transition, state))
						return false;
				} catch (e) {
					logError("ignoring error in guard (skipping transition): "+e);
					return false;
				}


			// call the exit action of the current state, if any
			var dest = transition.to;
			logSM('['+state.name+'] -- '+type+' -> '+(dest? ('['+dest.name+']') : 'same state'));
			if (dest && state.exit)
				try {
					state.exit.call(machine, event, transition, state);
				} catch(e) {
					logError("ignoring error in state exit action: "+e);
				}
			// call the transition action, if any
			if (transition.action)
				try {
					transition.action.call(machine, event, transition, state);
				} catch(e) {
					logError("ignoring error in transition action: "+e);
				}

			// set the new current state and call the enter action of the destination state, if any
			if (dest) {
				transition.machine.currentState = dest;
				if (dest.enter)
					try {
						dest.enter.call(machine, event, transition, state);
					} catch(e) {
						logError("ignoring error in state enter action: "+e);
					}
			}

			return true;
		}

		// single transition
		if (!transitions.length)
			return processTransition(transitions);

		// array of transitions: try them in turn
		for (var i = 0; i < transitions.length; i++)
			if (processTransition(transitions[i]))
				return true;

		// if we get there, nothing fired
		// logSM('  no transition');
		logSM('['+state.name+'] -- '+type+' -> no active transition');
		return false;
	}

	/**
	Create and cancel timeout events.
	This version only manages one active timer.
	**/
	StateMachine.prototype.armTimeout = function (delay) {
		if (this._timer)
			this.cancelTimeout;
		var machine = this;
		this._timer = setTimeout(function() {
			machine.processEvent('timeout', null);
		}, delay);
	}

	StateMachine.prototype.cancelTimeout = function () {
		if (this._timer) {
			clearTimeout(this._timer);
			delete this._timer;
		}
	}
