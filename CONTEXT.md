# Espressionism

A coffee cost calculator with a demo espresso-machine store, and Robospresso, the chat assistant that answers questions about the store.

## Language

### Robospresso's memory

**Memory**:
Robospresso's ability to remember earlier turns of a conversation. Memory is the name of the feature, not something stored.
_Avoid_: History (as a feature name), context

**Session**:
One conversation that the server remembers, identified by a session ID that the server issues. A session expires after a period of inactivity and can be lost at any time.
_Avoid_: Conversation, chat, thread

**Turn**:
One text entry in a session, said by either the user or Robospresso.
_Avoid_: Message (that's the UI's richer object, with parts), entry

**Window**:
The turns from a session that Robospresso reads to write one answer.
_Avoid_: Context, history slice

**Restarted session**:
A new session the server starts because the client asked for one that is unknown or expired. The user is told that the earlier conversation was forgotten.
_Avoid_: Expired session (that's the cause, not the result)

### Robospresso's tools

**Display tool**:
A tool Robospresso calls to put something on screen instead of describing it in words: machine cards, a store link, or a calculator fill. The model picks what to show; the data in it comes from the store or the calculator, never from the model.
_Avoid_: UI tool, widget

**Fill**:
Robospresso or a browser agent setting some of the calculator's fields on the visitor's behalf; the fields it didn't name keep what the page shows.
_Avoid_: Autofill, prefill
