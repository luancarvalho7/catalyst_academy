// Lesson context for the AI coach. Server-only: imported by app/api/coach/route.ts, never by a client component.

export type CoachLesson = { title: string; content: string };

export const COACH_LESSONS: Record<number, CoachLesson> = {
  1: {
    title: "Introduction to Catalyst Academy",
    content: `1. Orientation. Your First Trade
   1. How Academy works and what practice mode is.
   2. Details: trading vs gambling.
      1. Practice on a simulator - you'll learn mechanics, orderbook (see above)
   3. Trader assessment:
      1. Trading experience (single): New to trading / I trade other markets / I trade prediction markets. Sets default entry point.
      2. Markets you've traded (multi): stocks, options, futures, crypto, forex, prediction markets, sports betting, DFS, none.
      3. Prediction market accounts (multi): Polymarket, Kalshi, other, none.
      4. What you want from Catalyst (single): learn how prediction markets work / find out if I have an edge / pass the Challenge and get paid / just looking. Drives which CTA and email track they get.
      5. Categories you care about (multi): politics, sports, crypto, economics, geopolitics, culture. Picks the example markets in practice and the content sent.
      6. How you decide what to trade now (single): news and gut / follow other traders / my own model or data / haven't traded yet. Feeds the Edge vs Alpha framing and the skill-vs-luck lesson.
   4. Future state: placement quiz (Edge or Alpha?, 7 of 8 unlocks Course 2).
   5. Practice: place a practice trade`,
  },
  2: {
    title: "How Prediction Markets Work",
    content: `2. How a market works. Price = Probability
   1. Rule: A share pays $1 or $0; price is the market's probability.
   2. Details: resolution rules and sources; picking a first market (liquid, near-term, clear rule). What moves the price: news, big traders, liquidity drying up, injuries, lineup changes.
   3. More in-depth: resolution risk, mention markets, international events
   4. Practice / Game:
      1. pick one of three markets and say why. (note: give instant feedback based on their decision)
      2. 5 cards with questions like “Will Bitcoin Go Up in 2026?”, give them a slider to guess 0-100% and show results. Last card can be the pick three market and why`,
  },
  3: {
    title: "How Much Should You Risk?",
    content: `Imagine you're watching an NFL game. The Chiefs are winning, and you notice something interesting. You can buy a YES contract on the Chiefs winning for 95 cents. That means the market is pricing their chance of winning at roughly 95%. Sounds like easy money, right? So you decide to put your entire $1,000 account into that trade. If the Chiefs win, you make about $52 in profit. Not bad, right? But here's the problem. What happens if they lose? You lose your entire $1,000. And that's something a lot of beginners overlook. Even a 95% chance of winning still comes with a chance of losing. And when you're risking $1,000 just to make $52, one bad trade can wipe out the profits from a whole bunch of winning trades.
So, how much should you actually risk? Let's say you have $1,000 in your trading account. Before you place a trade, you make yourself a simple rule. "I'm not willing to lose more than $20 on a single market." That's just 2% of your account. Now, imagine you find a YES contract trading at 50 cents. You decide to buy 40 contracts. That costs you $20. If you're right, those contracts pay out $40, and you walk away with $20 in profit. If you're wrong, you lose your $20. And that's it. You've already decided how much you're comfortable losing. This is what traders call position sizing. It's really just deciding how much money to put into a trade. Nothing complicated. But here's the important part. You make that decision before you find out whether you're right or wrong. Now, let's talk about something else that matters. Your account balance. Imagine you start trading with $1,000. You make a few good trades, and suddenly your account is worth $1,200. Pretty good!`,
  },
  4: {
    title: "How Do You Actually Get Filled?",
    content: `[Scene 1 — The Hook: Why Did I Pay More?]
Imagine you're watching an NFL game.
You open a prediction market and see that the Chiefs have a 60% chance of winning.
YES contracts are trading at 60 cents.
So you decide to buy 100 contracts.
Simple, right?
100 contracts at 60 cents should cost you $60.
But when you place your order, something strange happens.
You end up paying $64.
Wait a second.
If the price was 60 cents, why did you pay more?
Well, that's because in prediction markets, the price you see isn't always the price you actually pay.
And to understand why, you need to know how buying and selling really works.
[Scene 2 — The Order Book: Who Are You Buying From?]
Here's something a lot of beginners don't realize.
When you buy a contract, you're usually buying from another trader who's willing to sell it.
Think of it like a marketplace.
Some people want to buy. Others want to sell.
But not everyone agrees on the price.
Imagine you're trying to buy 100 YES contracts.
One seller is offering 20 contracts at 60 cents.
Another is offering 30 contracts at 62 cents.
And another is offering 50 contracts at 65 cents.
So even though the cheapest available price is 60 cents, there aren't enough contracts at that price for your entire order.
All these buying and selling offers are organized in something called the order book.
The prices buyers are offering are called bids.
The prices sellers are asking for are called asks.
And the difference between the highest bid and the lowest ask is called the spread.
For example, if buyers are offering 58 cents and sellers are asking 60 cents, the spread is 2 cents.
Now, this brings us to another important concept.
Liquidity.
Liquidity is basically how easy it is to buy or sell something without moving its price too much.
Imagine a market where thousands of contracts are available at almost the same price.
That's a liquid market.
You can usually buy or sell a lot without the price changing much.
But imagine another market where only a few contracts are available.
That's a market with low liquidity.
Even a relatively small order might have to go through several different prices.
And that's exactly why liquidity matters when you're trading.
[Scene 3 — Market Orders: Buy Right Now]
Now, let's go back to those 100 Chiefs contracts.
You want to buy them immediately.
So you place what's called a market order.
A market order basically tells the exchange:
"Buy my contracts right now, at the best available prices."
Remember our sellers?
20 contracts at 60 cents.
30 at 62 cents.
And 50 at 65 cents.
Your market order buys from all three.
So instead of paying $60, you pay $63.10.
Your average price is now 63.1 cents per contract.
That difference between the price you expected and the price you actually paid is called slippage.
And slippage can become a serious problem when you're trading markets with low liquidity.
The bigger your order compared to what's available, the more expensive execution can become.
That's the trade-off with market orders.
They're designed to prioritize speed.
But you don't have complete control over the final price.
[Scene 4 — Limit Orders: Set Your Own Price]
Now, what if you don't want to pay more than 61 cents?
That's where limit orders come in.
Instead of saying, "Buy immediately at whatever prices are available," you're saying:
"I want to buy 100 contracts, but I'm not paying more than 61 cents each."
So what happens?
Well, there are 20 contracts available at 60 cents.
Those can be bought immediately.
But the other sellers want 62 or 65 cents.
And your order won't pay those prices.
So you get 20 contracts, and the other 80 remain unfilled.
That's called a partial fill.
You wanted 100 contracts, but only 20 were available at your price.
Now you have a choice.
You can wait and see whether more sellers are willing to sell at 61 cents or less.
You can change your limit price.
Or you can cancel the remaining order.
The important thing is that a limit order gives you control over the maximum price you're willing to pay.
But it doesn't guarantee that your entire order will execute.
[Scene 5 — Selling Works the Same Way]
Now, buying is only half of trading.
What happens when you want to sell?
Let's say you bought YES contracts at 60 cents.
A few minutes later, the Chiefs score a touchdown.
Now those contracts are trading around 75 cents.
You don't necessarily have to wait until the game ends.
You can sell your contracts to another trader.
If you use a market sell order, you're accepting the best available buying offers.
But if there aren't enough buyers at the highest price, some contracts may sell for less.
Or you could place a limit sell order.
For example:
"I'm willing to sell, but not for less than 74 cents."
And just like buying, your order might fill immediately, partially, or not at all.
So whether you're buying or selling, the same principle applies.
You have to decide what's more important.
Getting the trade done quickly, or controlling the price.
[Scene 6 — Why Liquidity Matters When News Breaks]
Now, here's where things get interesting.
Imagine you're trading a market on whether the Chiefs will win.
Everything looks normal.
Then suddenly, Patrick Mahomes gets injured.
What do you think happens?
Traders react immediately.
Some rush to sell their YES contracts.
Others cancel their existing buying orders.
And suddenly, there might be far fewer buyers willing to pay the old prices.
That's when liquidity becomes especially important.
Imagine the highest available bid is 50 cents, but there are only 10 contracts someone is willing to buy at that price.
If you try to sell 500 contracts immediately, the rest may have to sell at much lower prices.
And while you're submitting the order, the available prices could be changing.
That's why market orders can be especially risky during major news events.
A limit order can protect you from selling below your chosen price.
But here's the catch.
If the market moves away from your limit, your order might never fill.
And sometimes, not getting out of a position can be costly too.
[Scene 7 — Closing]
So here's what I want you to remember.
A market order prioritizes getting your trade executed quickly.
A limit order lets you control the price you're willing to accept.
And liquidity determines how easily you can buy or sell without significantly affecting the price.
None of these concepts exist separately.
They all affect how much you actually pay when you enter a trade, and how much you receive when you exit.
Because you can predict an outcome correctly and still make a bad trade if you pay too much.
So before your next order, ask yourself:
"How many contracts are actually available at this price?"
"Am I willing to wait for a better price?"
"And what happens if the market moves before my order fills?"
Now, let's put this into practice.
You'll try buying 100 contracts using both market and limit orders.
And you'll see how liquidity, slippage, and timing can change the price you pay.`,
  },
  5: {
    title: "When Do You Get Out?",
    content: `You can predict the winner correctly and still lose money.
Here's how.
You buy 100 YES contracts on the Chiefs at 60 cents.
That's $60 invested.
The Chiefs score. The price jumps to 85 cents.
Your position is now worth $85.
You're up $25.
But you want more.
So you hold.
Then the other team scores twice.
The price crashes to 30 cents.
You panic and sell for $30.
You just lost $30.
And then the Chiefs win.
You were right about the outcome.
But you lost half your money.
Here's the lesson: Knowing when to exit matters just as much as knowing what to buy.
And there are three things you need to understand.
When to cut a loss.
When to take a profit.
And when to do absolutely nothing.
Let's start with losses.
You buy 100 contracts at 60 cents.
The price drops to 40 cents.
Your $60 position is now worth $40.
You're down $20.
If you haven't sold, that's an unrealized loss.
Once you sell, it becomes a realized loss.
But here's where beginners get it wrong.
They think, "I haven't lost anything until I sell."
Wrong.
Your position has already lost value.
Refusing to sell doesn't change that.
The question isn't whether you're losing money.
The question is whether keeping the position is still a good decision.
Ask yourself one thing.
If I didn't already own this contract, would I buy it at today's price?
If the answer is no, why are you still holding it?
Maybe the Chiefs' quarterback got injured.
Maybe new information changed the probability.
Maybe your original analysis was simply wrong.
Whatever the reason, if your advantage is gone, you need to reconsider the trade.
But if nothing important has changed, and you still believe the contract is undervalued, holding could make sense.
The key is to make decisions based on information, not emotion.
Which brings us to the next rule.
Plan your exit before you enter.
Let's say you're buying YES at 60 cents because you believe the real probability is 75%.
Before buying, you need three answers.
What would prove my prediction wrong?
How much money am I willing to lose?
And at what price would I consider taking profit?
For example, you might decide to risk no more than $20.
You might plan to reassess if the Chiefs lose their starting quarterback.
And you might consider selling if the contract reaches 85 cents.
Now you have a plan.
It doesn't guarantee a profitable trade.
And it doesn't guarantee your exit order will fill at the price you want.
But it gives you a framework for making decisions when emotions are high.
Now let's talk about making money.
You buy YES at 60 cents.
The price rises to 85 cents.
You're up 25 cents per contract.
Should you sell?
There are three choices.
Sell everything and lock in the profit.
Sell half, take some money off the table, and keep the rest.
Or hold everything until the event ends.
None of those choices is automatically correct.
Here's what matters.
At 85 cents, you can sell your contract for 85 cents.
Or hold it for a chance to receive $1.
That means you're risking 85 cents of current value to potentially earn another 15 cents.
That's the trade-off.
And your original purchase price of 60 cents?
It doesn't change that decision.
The market doesn't care what you paid.
What matters is what the contract is worth now and what you believe it's worth.
Let's say the market is offering 85 cents.
But based on your research, you believe the true probability is only 70%.
Selling may be the better decision.
Why hold something you believe is worth 70 cents when someone is offering you 85?
Now flip it.
You believe the real probability is 95%.
The market is offering 85 cents.
Holding might make sense because you believe the contract is still undervalued.
Of course, your estimate could be wrong.
That's why position sizing and risk limits still matter.
And remember, you don't have to wait until the game ends.
If you buy at 40 cents and sell at 70, you've made 30 cents per contract before fees.
That's exiting before resolution.
If you hold until resolution, a winning YES contract pays $1.
A losing YES contract pays zero.
Selling early can lock in a gain, limit a loss, or free up capital.
Holding keeps you exposed to the final outcome.
Both are tools.
The skill is knowing when each makes sense.
Now, here's where traders destroy their accounts.
Not because they can't predict outcomes.
Because they can't control themselves after losing.
You lose $50.
You're angry.
You want your money back.
So instead of risking your normal $20, you put $100 into the next trade.
You're not following your strategy anymore.
You're trying to erase the feeling of losing.
That's revenge trading.
Also called tilt.
And it's one of the fastest ways to turn a small loss into a big one.
Think about it.
Did losing $50 make your next prediction more accurate?
No.
Did it give you better information?
No.
Did it create a better opportunity?
No.
So why are you risking five times more?
Because you're emotional.
And that's exactly when you shouldn't be increasing your risk.
A losing trade doesn't justify a bigger next trade.
Your risk limits exist for moments like this.
If you're frustrated, stop.
You don't have to trade every opportunity.
And you definitely don't have to recover every loss today.
Sometimes the best trade is no trade.
Here's what I want you to remember.
First, cut a position when your original reasoning no longer holds or your risk limit requires it.
Second, don't take profit just because you're afraid of losing what you've made.
Evaluate whether holding still offers a worthwhile opportunity.
Third, never increase your risk just to recover a previous loss.
And finally, understand this.
Every time you choose not to sell, you're choosing to stay invested.
That's a decision.
Treat it like one.
Because the goal isn't to squeeze every dollar out of every prediction.
It's to make disciplined decisions, protect your capital, and stay in the game long enough for your advantage to matter.`,
  },
};

export function coachSystemPrompt(lessonNumber: number): string | null {
  const lesson = COACH_LESSONS[lessonNumber];
  if (!lesson) return null;
  return `You are the coach inside Catalyst Academy. The student is on Lesson ${lessonNumber}: ${lesson.title}. Answer the student's question based on this lesson content:

${lesson.content}`;
}
