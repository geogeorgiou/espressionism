# Espressionism

A coffee cost calculator with a demo espresso-machine store, and Robospresso, the chat assistant that answers questions about the store.

## Language

### People and agents

**Visitor**:
The person using the site. There are no accounts, and nobody really buys anything.
_Avoid_: User, customer

**Agent**:
An AI that acts on the page through its tools, on the visitor's behalf: the site's own (Robospresso) or one the visitor brings in their browser.
_Avoid_: Bot, assistant

**Robospresso**:
The persona of the site's own agent: Bitspresso's espresso-machine robot cousin who runs the chat.
_Avoid_: The bot, the AI

### Calculator

**Café**:
The side of the comparison where the visitor keeps buying their drink out.
_Avoid_: Out, shop

**Home**:
The side of the comparison where the visitor makes their drink with an espresso machine of their own.
_Avoid_: DIY, homemade

**Habit**:
What the visitor buys at the café and how often: the drink, its price, cups per day and days per week.
_Avoid_: Routine, usage, consumption

**Drink**:
The café drink the visitor usually buys, and that the calculator prices a habit around.
_Avoid_: Flavor (that's the mascot's), coffee type

**Espresso machine**:
A machine the visitor could buy to make their drinks at home, whether from the store or not. "Machine" on its own is fine once the context is clear.
_Avoid_: Product, device

**Years**:
How many whole years the café and home are compared over.
_Avoid_: Horizon, comparison period, duration

**Home cost**:
What making drinks at home costs per year (ingredients and upkeep), not counting the espresso machine's price.
_Avoid_: Running cost, maintenance cost

**Net savings**:
The café's total minus home's total over the years compared. Negative means the café wins.
_Avoid_: Profit, total savings

**Effective cup cost**:
What one home cup really costs over the years compared, with the espresso machine's price spread across every cup.
_Avoid_: Real cup cost, cost per cup (that's the home cost of one cup)

**Verdict**:
A plain-language read on whether an espresso machine pays for itself within the years compared. It's one of four labels: fast, solid, slow, or café wins.
_Avoid_: Result, outcome

**Café wins**:
The verdict when the espresso machine doesn't pay for itself within the years compared, whether it never would or would only later.
_Avoid_: Never

### Store

**Demo store**:
The site's pretend espresso-machine shop: real brands, invented prices and ratings, nothing for sale.
_Avoid_: Shop, marketplace

**Catalog**:
The fixed set of espresso machines the demo store lists.
_Avoid_: Inventory, products

**Rating**:
A score out of five stars given to an espresso machine in the catalog.
_Avoid_: Score, review

**Unrated**:
An espresso machine with no rating yet. It ranks below every rated machine and is left out once the visitor asks for a minimum rating.
_Avoid_: Zero-rated, no reviews

**Store link**:
A link into the demo store with a search already applied.
_Avoid_: Search link, deep link

### Robospresso's memory

**Memory**:
Robospresso's ability to remember earlier turns of a conversation. Memory is the name of the feature, not something stored.
_Avoid_: History (as a feature name), context

**Conversation**:
One exchange between the visitor and Robospresso that the server remembers, identified by a session ID that the server issues. A conversation expires after a period of inactivity and can be lost at any time.
_Avoid_: Chat (that's the panel), thread

**Turn**:
One text entry in a conversation, said by either the visitor or Robospresso.
_Avoid_: Message (that's the UI's richer object, with parts), entry

**Window**:
The turns from a conversation that Robospresso reads to write one answer.
_Avoid_: Context, history slice

**Restarted conversation**:
A new conversation the server starts because the client asked for one that is unknown or expired. The visitor is told that the earlier conversation was forgotten.
_Avoid_: Expired conversation (that's the cause, not the result)

### Robospresso's tools

**Display tool**:
A tool Robospresso calls to put something on screen instead of describing it in words: espresso machine cards, a store link, or a calculator fill. The model picks what to show; the data in it comes from the store or the calculator, never from the model.
_Avoid_: UI tool, widget

**Fill**:
An agent setting some of the calculator's fields for the visitor; the fields it didn't name keep what the page shows.
_Avoid_: Autofill, prefill

### Mascots

**Bitspresso**:
The site's mascot: a pixel coffee cup that appears in one of two forms.
_Avoid_: Mug (that's one form), logo

**Form**:
The kind of cup Bitspresso is drawn as: a mug or a to-go cup.
_Avoid_: Variant, shape

**Mood**:
The face a mascot is wearing, such as happy, sleepy or scared. Robospresso has his own moods, cool and searching.
_Avoid_: Expression, emotion, state

**Flavor**:
The colour band a mascot wears to show a drink.
_Avoid_: Drink (that's the calculator's), colour
