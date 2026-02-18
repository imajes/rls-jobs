# RLS Jobs App Spec

## The problem

A very popular/busy slack has a high flow of jobs postings. These are posted 'ad-hoc' and not with any kind of structure.
They're also impossible to find / discover, and given there are so many posts, it can get quite overwhelming.

In fact, it is so bad that there's a periodic slackbot reminder:

```
Reminder: It would be helpful if posts noted, without having to click a link, the company name, role title, a location (office in city/cities, remote in state(s)/timezone(s)/country/countries/global), compensation, visa sponsorship, and your relationship to the role (hiring manager, will connect to hiring manager, general recruitment for the company, job seeker).
```

I've bootstrapped a bolt for javascript app in the `slack-app` subdirectory. NOTE: it does not need to use this framework, but... it'd be ideal if it used the best future-forward framework, to make compliance / reliability / etc be as smooth as possible.

Work is broken into steps. these steps aren't necessarily required to be executed in order, but they describe the stages that should be completed to deliver this app.

## Stage Zero: Get to know the slack api / tools / abilities

You should check <https://docs.slack.dev/> - the Guides, Samples, reference etc seem smart, but that whole site is noisy with other things (such as blogs and the dev program... don't get lost).

## Step One: Build a flexible job & candidate posting ui with block-kit

Slack has an extensive ui toolkit called "block-kit". This can be used to provide solid, useful, consistent shapes of content that help make common message groups fit into a consistent format.

it should use all of the appropriate elements available -- don't lean hard into one structure or another, be agile and pragmatic... but also don't be too overbearing with chrome: it should be as effective, minimalist, smart, intentional as possible.

## Step Two

Posting jobs or availability needs a simple workflow that would allow a user to enter and create the job posting and add it to the message flow. we're also going to want it to post to an API endpoint, so that it can get added to a searchable database too, i suspect.

## Step Three

package up the slack app, and deliver the steps needed to publish it / go live.

## Step Four

I've generated a rails 8 app in the `jobs-api` subdirectory. You should now update this to deliver a jobs api that (probably via a webhook) will receive new jobs + candidate postings and save them to the database. Capture all the info you can, so we have a comprehensive capture of what is what.

## Step Five

build a ui using rails best practices to allow a human to be able to browse current jobs + applicants. Lots of filters, searches, sorts. Use modern ui principles, and make it responsive. Open to technologies here, but ideally it should use rails best practices, so probably best not to spin up a separate react ui toolkit?

## Step Six

Now, RLS slack is kept as a Chatham-House Rules type of space; there are strict requirements to prohibit information being used elsewhere. To respect this, i'd like you to extend both the slack app and rails app to permit an 'authentication' strategy. We don't need users per-se, but we do need a way to validate that the user came from RLS. My suggestion is to use some kind of slash command that gives a one-time url, which would generate a valid session, but expire in ~ 1 hr . that session can keep pushing if the user interacts, but ultimately it's TTL should never exceed an hour.

---

For each of these steps, you should:

1. analyze the requirements carefully. Where there are questions or more information needed to improve your guidance, ALWAYS STOP AND ASK QUESTIONS.

2. after each step, STOP, summarize, and request feedback. If things look good, we'll git commit and move forward.

3. During each step, you should thoroughly document what you have done and learnt. To be effective, you should create and use a `docs/` folder within each sub project, as well as in the overall project folder. Files should be in markdown, intuitive and accessible.

## overall notes

ALWAYS ask questions when unsure, however our goal here is for you to work in the background making excellence happen. I believe in you. :)
