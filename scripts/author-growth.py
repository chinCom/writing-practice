"""Rebuild unapproved growth content. Never modifies the reviewed Core source.

Every drill, noticing span, parallel prompt and reading passage below is authored
data. Running this script rewrites curriculum/growth.draft.json and resets approval.
"""

import copy
import hashlib
import json
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
units = json.loads((root / 'curriculum/course.draft.json').read_text())

# Mirrors FEEDBACK_ONLY in src/lib/targets.ts. Drills use the first two other focus tags.
FEEDBACK_ONLY = {
    'word-choice', 'collocation', 'false-friend', 'word-form', 'register', 'repetition',
    'cohesion', 'paragraphing', 'topic-sentence', 'task-response', 'off-topic', 'too-short',
    'tone-formality',
}

SUFFIX = ' Use a new example; do not revise or copy your unit-start response.'

# Each noticing: (instruction, explanation, [(phrase, word), ...]).
# The phrase must occur exactly once in the first lesson's model text. The word is selected inside it.
NOTICING = {
    'first-words': (
        'Find every pronoun I in the model. Notice its capital letter.',
        'The pronoun I always starts with a capital letter, even in the middle of a sentence.',
        [('I am Lin', 'I'), ('I am a student', 'I'), ('I study in Hanoi', 'I')],
    ),
    'people-and-places': (
        'Find every form of be that follows one singular subject.',
        'Use is after he, she, it or one singular noun in present statements.',
        [('friend is Lan', 'is'), ('She is a nurse', 'is'), ('She is very kind', 'is')],
    ),
    'small-actions': (
        'Find every present simple verb that describes a daily routine.',
        'With I, use the base verb. Present simple describes actions that happen regularly.',
        [('I wake up at six', 'wake'), ('I drink warm water', 'drink')],
    ),
    'first-messages': (
        'Find the two connectors that join two clauses in the message.',
        'And joins two facts. Because gives the reason for an action.',
        [('Nam, and I live', 'and'), ('because I want to write', 'because')],
    ),
    'daily-routines': (
        'Find every adverb of frequency that tells how often the routine happens.',
        'Frequency adverbs such as usually, always and sometimes go before the main verb.',
        [('I usually wake up', 'usually'), ('I always take', 'always'), ('I sometimes cook', 'sometimes')],
    ),
    'simple-requests': (
        'Find the two modal verbs in the message: one for a request and one for a promise.',
        'Could makes the request polite. Will shows what the writer promises to do.',
        [('Could you please', 'Could'), ('I will read', 'will')],
    ),
    'connected-messages': (
        'Find every irregular past simple verb in the message.',
        'Irregular past verbs change form and do not add -ed, so learn each one.',
        [('I had a wonderful', 'had'), ('rode through', 'rode'), ('we ate fresh', 'ate'), ('I felt completely', 'felt')],
    ),
    'explain-a-problem': (
        'Find the two words that join two full clauses in the message.',
        'And joins two clauses. So introduces the result of the sentence before it.',
        [('evening, and now', 'and'), ('all day, so', 'so')],
    ),
    'experience-and-advice': (
        'Find the two modal verbs that give advice in the model.',
        'Should gives advice and shouldn’t gives negative advice. Both take the base verb.',
        [('you should pack', 'should'), ("you shouldn't buy", "shouldn't")],
    ),
    'clear-paragraphs': (
        'Find the two words that introduce a time clause or a reason clause.',
        'Since introduces a time clause. Because introduces the reason for the sentence.',
        [('Since the district', 'Since'), ('because people enjoy', 'because')],
    ),
    'evidence-and-examples': (
        'Find every word that starts a time clause or a relative clause in the model.',
        'When and Once start time clauses. Which adds extra information about the previous clause.',
        [('when I tracked', 'when'), ('Once I saw', 'Once'), ('which saved me', 'which')],
    ),
    'formal-email': (
        'Find every modal verb that makes a request indirect and polite.',
        'Could and would make requests less direct, which sounds more polite in formal email.',
        [('Could you please let', 'Could'), ('I would appreciate', 'would'), ('if you could share', 'could')],
    ),
    'formal-requests': (
        'Find the four sentence openers that show time, reason or purpose.',
        'Opening phrases such as During, Because, By and To place a time, reason or purpose before the main clause.',
        [('During our last', 'During'), ('Because all live', 'Because'), ('By the third week', 'By'), ('To ensure the whole', 'To')],
    ),
    'balanced-argument': (
        'Find every word that concedes a point or sets up a contrast.',
        'These words concede a point or set up a contrast before the writer answers it.',
        [('While restricting private', 'While'), ('Admittedly, supporters', 'Admittedly'), ('Nevertheless, enforcing', 'Nevertheless'), ('Unlike office executives', 'Unlike')],
    ),
    'evidence-of-fit': (
        'Find every past simple verb that shows what the writer did in the second paragraph.',
        'Past simple verbs report completed actions. They give evidence of the writer’s contribution.',
        [('I collaborated with', 'collaborated'), ('and built an automated', 'built'), ('I also wrote a', 'wrote'), ('and ran a thirty-minute', 'ran')],
    ),
    'motivation-and-evidence': (
        'Find every that that introduces a clause. Skip the that that points to a noun.',
        'That introduces a noun clause after a reporting verb, or a relative clause after a noun.',
        [('revealed that automated', 'that'), ('terminology that elderly', 'that'), ('demonstrated that landmark', 'that'), ('frameworks that are both', 'that')],
    ),
    'verified-programme-fit': (
        'Find every participle phrase that opens a sentence and adds a related action.',
        'An opening participle adds a related action without repeating the subject.',
        [('Pairing this coursework', 'Pairing'), ('Having cleaned and', 'Having'), ('Working alongside this', 'Working')],
    ),
    'edit-an-application': (
        'Find every past verb that shows the writer’s own action in the second paragraph.',
        'Direct past verbs with I name the writer’s own actions, so the reader sees the contribution.',
        [('I replaced passive', 'replaced'), ('I consolidated four', 'consolidated'), ('I eliminated manual', 'eliminated'), ('and reduced monthly', 'reduced')],
    ),
    'synthesis-and-qualification': (
        'Find every if or when that opens a clause.',
        'If sets a condition. When sets the circumstance in which a result happens.',
        [('If organizations automate', 'If'), ('When developers invoke', 'When'), ('when teams deploy', 'when')],
    ),
    'audience-and-register': (
        'Find the three sentence openers that concede a cost, set a condition or contrast.',
        'While concedes a cost. Without means if not. Conversely contrasts the other option.',
        [('While reallocating three', 'While'), ('Without isolating regional', 'Without'), ('Conversely, waiting to', 'Conversely')],
    ),
    'critical-capstone': (
        'Find every word that sets up a contrast between two options.',
        'Not and but reject one option and name the other. Rather than and instead also choose one option over another.',
        [('defined not by', 'not'), ('but by the coherent', 'but'), ('By contrast, a regional', 'contrast'), ('rather than brick-and-mortar', 'rather'), ('When leadership instead', 'instead')],
    ),
}

# Transfer drills: unit id -> [(tag, [(prompt, accepted answers, explanation), ...]), ...].
# Each tag gets four items. Answers include exact punctuation variants, because the checker
# compares text after whitespace and letter-case normalization only.
DRILLS = {
    'first-words': [
        ('capitalization', [
            ('Fix the capitals: i am tuan. i am from hue.', ['I am Tuan. I am from Hue.', 'I am Tuan. I am from Hue'], 'Write the pronoun I with a capital letter, and start names of places with capitals too.'),
            ('Fix the capitals: my city is hanoi. i like tea.', ['My city is Hanoi. I like tea.', 'My city is Hanoi. I like tea'], 'Each sentence starts with a capital letter. City names also start with a capital letter.'),
            ('Fix the capitals: i study english every day.', ['I study English every day.', 'I study English every day'], 'Write I as a capital letter. Write language names, like English, with a capital letter.'),
            ('Fix the capitals: i live near the lake in da nang.', ['I live near the lake in Da Nang.', 'I live near the lake in Da Nang'], 'Start the sentence with a capital letter. Each word of a city name starts with a capital.'),
        ]),
        ('punctuation', [
            ('Add the end mark: What is your name', ['What is your name?'], 'Use a question mark at the end of a question.'),
            ('Add the end mark: I live in Hanoi', ['I live in Hanoi.'], 'Use a full stop at the end of a statement.'),
            ('Add the end mark: Where do you study', ['Where do you study?'], 'A question ends with a question mark, not a full stop.'),
            ('Add the end mark: This is my friend Lan', ['This is my friend Lan.'], 'A statement ends with a full stop.'),
        ]),
    ],
    'people-and-places': [
        ('subject-verb-agreement', [
            ('Complete: My sister ___ at a hospital. (work)', ['works'], 'With he, she, it or one person, add -s to the verb.'),
            ('Complete: The children ___ in the park. (play)', ['play'], 'With a plural subject, such as children, use the base verb.'),
            ('Complete: My father ___ a blue car. (have)', ['has'], 'Has is the form of have for one person, such as my father.'),
            ('Complete: Her friends ___ very tall. (be)', ['are'], 'Use are with plural subjects, such as friends.'),
        ]),
        ('prepositions', [
            ('Complete: I live ___ Hue. (city)', ['in'], 'Use in before the name of a city or a country.'),
            ('Complete: My office is ___ the first floor.', ['on'], 'Use on before a floor of a building.'),
            ('Complete: She waits for me ___ the station.', ['at'], 'Use at before a place such as a station or a school.'),
            ('Complete: The cat sleeps ___ the table.', ['under'], 'Use under for a space below an object, like a table.'),
        ]),
    ],
    'small-actions': [
        ('verb-tense', [
            ('Complete: I ___ breakfast at seven. (eat)', ['eat'], 'Use the base verb with I in the present simple.'),
            ('Complete: We ___ to school by bus. (go)', ['go'], 'Use the base verb with we in the present simple.'),
            ('Complete: My mother ___ tea every morning. (drink)', ['drinks'], 'With he, she or it, add -s in the present simple.'),
            ('Complete: Every evening, they ___ TV. (watch)', ['watch'], 'Use the base verb with they in the present simple.'),
        ]),
        ('subject-verb-agreement', [
            ('Complete: He ___ early every day. (wake)', ['wakes'], 'With he, she or it, the present simple verb ends in -s.'),
            ('Complete: My brother ___ football on Sundays. (play)', ['plays'], 'My brother is one person, so the verb needs -s.'),
            ('Complete: The shop ___ at eight. (open)', ['opens'], 'A shop is one thing, so add -s to the verb.'),
            ('Complete: Lan and Mai ___ lunch together. (have)', ['have'], 'Two people take the base verb, without -s.'),
        ]),
    ],
    'first-messages': [
        ('connectors', [
            ('Complete with but or so: I like tea ___ I do not like coffee.', ['but'], 'But shows a contrast between two ideas.'),
            ('Complete with because or so: I was late ___ the bus was full.', ['because'], 'Because introduces the reason for being late.'),
            ('Complete with and or because: I study English ___ I want a better job.', ['because'], 'Because introduces the reason for studying.'),
            ('Complete with so or and: It was raining, ___ I took my umbrella.', ['so'], 'So introduces the result of the rain.'),
        ]),
        ('verb-tense', [
            ('Complete: Last week, I ___ a new friend at class. (meet)', ['met'], 'Use the past simple for an action that finished last week.'),
            ('Complete: Yesterday, I ___ my homework at home. (finish)', ['finished'], 'Add -ed to a regular verb in the past simple.'),
            ('Complete: Now I ___ in a small company in Da Nang. (work)', ['work'], 'Use the present simple for a job you have now.'),
            ('Complete: Last year, we ___ to Nha Trang. (travel)', ['travelled', 'traveled'], 'Use the past simple for a finished trip. Both spellings are correct.'),
        ]),
    ],
    'daily-routines': [
        ('word-order', [
            ('Put in order: after dinner / we / watch / TV', ['We watch TV after dinner.', 'We watch TV after dinner', 'After dinner, we watch TV.', 'After dinner we watch TV.'], 'A time phrase can go at the start or the end of a sentence.'),
            ('Put in order: is / never / late / she', ['She is never late.', 'She is never late'], 'Put a frequency adverb after am, is or are.'),
            ('Put in order: cooks / my brother / always / dinner', ['My brother always cooks dinner.', 'My brother always cooks dinner'], 'Put a frequency adverb before the main verb.'),
            ('Put in order: at seven / I / eat / breakfast', ['I eat breakfast at seven.', 'I eat breakfast at seven'], 'A time phrase often comes at the end of a simple sentence.'),
        ]),
        ('verb-tense', [
            ('Complete: Every weekday, I ___ the metro. (take)', ['take'], 'Use the present simple for a habit that repeats.'),
            ('Complete: Yesterday, I ___ the metro late. (take)', ['took'], 'Took is the past simple of take.'),
            ('Complete: On Sundays, my parents ___ lunch at home. (have)', ['have'], 'With two people, use the base verb in the present simple.'),
            ('Complete: Last Sunday, my parents ___ at a restaurant. (eat)', ['ate'], 'Ate is the past simple of eat.'),
        ]),
    ],
    'simple-requests': [
        ('modal-verbs', [
            ('Complete with the base verb: Could you ___ me your notes? (send)', ['send'], 'After could, use the base verb, not a form with -s.'),
            ('Complete with the base verb: You must ___ your name here. (write)', ['write'], 'After must, use the base verb without to.'),
            ('Complete with the base verb: Can you ___ the door, please? (close)', ['close'], 'After can, use the base verb.'),
            ('Complete with the base verb: I should ___ early tomorrow. (leave)', ['leave'], 'After should, use the base verb, such as leave.'),
        ]),
        ('punctuation', [
            ('Add the end mark: Could you help me with this form', ['Could you help me with this form?'], 'A polite question still ends with a question mark.'),
            ('Add the end mark: Please send me the notes', ['Please send me the notes.'], 'A polite instruction ends with a full stop.'),
            ('Add the end mark: I will bring the book tomorrow', ['I will bring the book tomorrow.'], 'A statement about the future ends with a full stop.'),
            ('Add the end mark: What time does the class start', ['What time does the class start?'], 'A question ends with a question mark.'),
        ]),
    ],
    'connected-messages': [
        ('verb-tense', [
            ('Complete: Last Saturday, we ___ a boat on the river. (take)', ['took'], 'Take is irregular, so its past simple form is took.'),
            ('Complete: We ___ the bus to the beach on Sunday. (catch)', ['caught'], 'Catch is irregular; its past simple form is caught.'),
            ('Complete: Last night, we ___ to bed very late. (go)', ['went'], 'Go is irregular; its past simple form is went.'),
            ('Complete: My cousin ___ me a scarf last week. (give)', ['gave'], 'Give is irregular; its past simple form is gave.'),
        ]),
        ('connectors', [
            ('Complete with because or so: We rested at noon ___ it was very hot.', ['because'], 'Because gives the reason for resting at noon.'),
            ('Complete with although or but: ___ the rain was heavy, we went for a walk.', ['Although'], 'Although introduces a fact that does not stop the main action.'),
            ('Complete with so or because: We missed the last ferry ___ we stayed the night.', ['so'], 'So introduces the result of missing the ferry.'),
            ('Complete with although or because: ___ the museum was closed, we took photos outside.', ['Although'], 'Although shows a contrast: the museum was closed, but we still took photos.'),
        ]),
    ],
    'explain-a-problem': [
        ('verb-tense', [
            ('Complete: The shower ___ working on Monday. (stop)', ['stopped'], 'Stop doubles the p before -ed in the past simple.'),
            ('Complete: I ___ the plumber yesterday. (call)', ['called'], 'Add -ed to a regular verb for a finished past action.'),
            ('Complete: The package ___ two days late. (arrive)', ['arrived'], 'Verbs ending in e add only -d in the past simple.'),
            ('Complete: The lights ___ off last night. (go)', ['went'], 'Go is irregular; its past simple form is went.'),
        ]),
        ('connectors', [
            ('Complete with so or because: The box was damaged, ___ I asked for a refund.', ['so'], 'So introduces the result of the damage.'),
            ('Complete with but or because: The shirt is cheap, ___ it has small holes.', ['but'], 'But introduces a contrast: cheap, but with holes.'),
            ('Complete with because or so: The lesson was cancelled ___ the teacher was ill.', ['because'], 'Because gives the reason the lesson was cancelled.'),
            ('Complete with when or although: ___ the sink leaked, we called the manager.', ['When'], 'When introduces the time that the problem happened.'),
        ]),
    ],
    'experience-and-advice': [
        ('modal-verbs', [
            ('Complete with the base verb: You should ___ a map before you walk in the old town. (bring)', ['bring'], 'Should is followed by the base verb, such as bring.'),
            ('Complete with the base verb: You must ___ your ticket before the train leaves. (buy)', ['buy'], 'Must is followed by the base verb, without to or -s.'),
            ('Complete with the base verb: You shouldn’t ___ food on the bus. (eat)', ['eat'], 'Shouldn’t is the negative of should, and the verb stays in base form.'),
            ('Complete with the base verb: The shops might ___ closed on Monday. (be)', ['be'], 'Might is followed by the base verb be.'),
        ]),
        ('comparatives-superlatives', [
            ('Complete: Hue is ___ than Hanoi, so it feels calm. (quiet)', ['quieter'], 'Add -er to a short adjective to compare two places.'),
            ('Complete: This is the ___ beach in the city. (clean)', ['cleanest'], 'Use the and -est for the most, with a short adjective.'),
            ('Complete: The bus is ___ than the train here. (cheap)', ['cheaper'], 'Add -er to a short adjective, and use than for the comparison.'),
            ('Complete: Of all the cafes, this one is the ___. (good)', ['best'], 'Good is irregular: better, then best.'),
        ]),
    ],
    'clear-paragraphs': [
        ('connectors', [
            ('Complete with however or therefore: The new bus lane was popular; ___, traffic on the main road did not improve.', ['however'], 'However introduces a contrast with the sentence before it.'),
            ('Complete with despite or although: ___ the heavy rain, the market stayed open all week.', ['Despite'], 'Despite is followed by a noun phrase, not a full clause.'),
            ('Complete with moreover or therefore: The park is clean and safe; ___, it has free Wi-Fi.', ['Moreover'], 'Moreover adds another supporting point to the same idea.'),
            ('Complete with while or whereas: ___ the old factory closed, the new library opened that year.', ['While', 'Whereas'], 'While can show two events at the same time, or a contrast.'),
        ]),
    ],
    'evidence-and-examples': [
        ('connectors', [
            ('Complete with for example or however: Many small costs add up. ___, a daily coffee can cost more than a weekly lunch.', ['For example', 'For instance'], 'For example introduces a concrete case that supports the general point.'),
            ('Complete with as a result or in addition: The students practised every day. ___, their writing scores improved.', ['As a result'], 'As a result shows the outcome of the earlier action.'),
            ('Complete with in addition or as a result: The gym is cheap. ___, it is close to my office.', ['In addition'], 'In addition adds one more reason in the same direction.'),
            ('Complete with despite or because of: The shop closed early ___ the storm.', ['because of', 'due to'], 'Because of and due to are followed by a noun phrase, such as the storm.'),
        ]),
        ('relative-clauses', [
            ('Complete with who or which: The friend ___ lent me the book lives nearby.', ['who'], 'Use who for a person in a relative clause.'),
            ('Complete with where or which: The cafe ___ we met has free Wi-Fi.', ['where'], 'Use where for a place in a relative clause.'),
            ('Complete with whose or who: The student ___ notebook I found sits in the library.', ['whose'], 'Whose shows that the notebook belongs to the student.'),
            ('Complete with which or who: The budget app, ___ I downloaded last month, shows every purchase.', ['which'], 'Which adds extra information about a thing, after a comma.'),
        ]),
    ],
    'formal-email': [
        ('question-formation', [
            ('Put in order: when / the course / does / start', ['When does the course start?', 'When does the course start'], 'In a question, the auxiliary verb goes before the subject.'),
            ('Put in order: how much / is / the fee', ['How much is the fee?', 'How much is the fee'], 'Put the question word first, then the verb, then the subject.'),
            ('Put in order: can / where / I / register / online', ['Where can I register online?', 'Where can I register online'], 'Put the question word first, then the modal verb, then the subject.'),
            ('Put in order: are / materials / included / in the fee', ['Are materials included in the fee?', 'Are materials included in the fee'], 'A yes-or-no question starts with the verb, not the subject.'),
        ]),
        ('modal-verbs', [
            ('Complete with the base verb: Would you ___ me the syllabus? (send)', ['send'], 'Would you is polite; use the base verb after it.'),
            ('Complete with the base verb: Could you ___ whether seats are available? (confirm)', ['confirm'], 'Could is followed by the base verb, such as confirm.'),
            ('Complete with the base verb: I would ___ to receive the price list. (like)', ['like'], 'Would like is a polite way to make a request.'),
            ('Complete with the base verb: The organiser might ___ a group discount. (offer)', ['offer'], 'Might shows possibility and takes the base verb.'),
        ]),
    ],
    'formal-requests': [
        ('conditionals', [
            ('Complete: If the budget ___ approved this month, we will start the course in November. (be)', ['is'], 'First conditional: if plus present simple, then will for a likely result.'),
            ('Complete: If I had studied law, I ___ a lawyer by now. (be)', ['would be', '\'d be'], 'Mixed conditional: a past condition with a present result uses would plus base verb.'),
            ('Complete: If our team ___ more training, it would make fewer mistakes. (receive)', ['received'], 'Second conditional: if plus past simple, then would plus base verb, for an unreal case.'),
            ('Complete: If we had taken the course last year, our releases ___ faster. (be)', ['would have been', '\'d have been'], 'Third conditional: if plus past perfect, then would have plus past participle.'),
        ]),
    ],
    'balanced-argument': [
        ('connectors', [
            ('Complete with whereas or while: Public transport is cheap, ___ private cars are costly to run.', ['whereas', 'while'], 'Whereas contrasts two facts or groups side by side.'),
            ('Complete with nevertheless or therefore: Parking fees are high. ___, many drivers still come downtown.', ['Nevertheless', 'However'], 'Nevertheless introduces a point that goes against what came before.'),
            ('Complete with even though or because: ___ the bus is slow, it is still the most affordable option.', ['Even though', 'Although'], 'Even though introduces a concession that does not change the main claim.'),
            ('Complete with in contrast or in addition: Rural roads are quiet and safe. ___, city streets are noisy and crowded.', ['In contrast'], 'In contrast introduces an opposite point, not an extra one.'),
        ]),
        ('relative-clauses', [
            ('Complete with which or who: The new line, ___ opened in 2024, carries 40,000 riders daily.', ['which'], 'A comma before which adds extra information about the line.'),
            ('Complete with who or whose: The engineers ___ designed the metro now teach at the university.', ['who'], 'Who refers to people in a defining relative clause.'),
            ('Complete with where or who: A city ___ buses run every five minutes is easy to explore.', ['where'], 'Where refers to a place in a relative clause.'),
            ('Complete with which or that: The policy, ___ was announced in May, affects every commuter.', ['which'], 'That cannot follow a comma, so use which for extra information.'),
        ]),
    ],
    'evidence-of-fit': [
        ('verb-tense', [
            ('Complete: Since I joined the team in 2023, I ___ three reports for clients. (write)', ['have written', '\'ve written'], 'Since with a past start point and a present result uses the present perfect.'),
            ('Complete: When the audit started last spring, the team ___ the old system for two years. (use)', ['had been using', 'had used'], 'The past perfect continuous shows an action that lasted before another past event.'),
            ('Complete: I ___ the training programme last year, which improved our reporting. (complete)', ['completed'], 'Last year is a finished time, so use the past simple.'),
            ('Complete: Over the past six months, our team ___ twelve new suppliers. (onboard)', ['has onboarded'], 'A period up to now with a present result uses the present perfect.'),
        ]),
    ],
    'motivation-and-evidence': [
        ('relative-clauses', [
            ('Complete with whose or which: The project, ___ results were published in 2025, changed local policy.', ['whose'], 'Whose connects the project to the results that belong to it.'),
            ('Complete with where or which: The district ___ the flood sensors failed first needs better maintenance.', ['where'], 'Where introduces a place in a defining relative clause.'),
            ('Complete with whom or who: The residents ___ we interviewed described the alerts as confusing.', ['whom'], 'Whom is the object form in formal writing: we interviewed them.'),
            ('Complete with that or which: The alert system ___ residents trusted most used simple landmarks.', ['that'], 'Use that, without a comma, for a defining relative clause.'),
        ]),
    ],
    'verified-programme-fit': [
        ('relative-clauses', [
            ('Complete with where or which: The lab ___ I worked last year has an open dataset.', ['where'], 'Where introduces a place in a defining relative clause.'),
            ('Complete with whose or which: The module ___ syllabus covers causal inference is taught in English.', ['whose'], 'Whose shows that the syllabus belongs to the module.'),
            ('Complete with who or that: The professor ___ leads the seminar studies transit equity.', ['who', 'that'], 'Who or that refers to a person in a defining relative clause.'),
            ('Complete with whom or who: The coordinator, ___ you met at the forum, can answer your questions.', ['whom'], 'Whom is the object form after a comma in formal writing.'),
        ]),
    ],
    'synthesis-and-qualification': [
        ('conditionals', [
            ('Complete: Had the team tested the code more carefully, the bug ___ before release. (catch)', ['would have been caught', '\'d have been caught'], 'Had replaces if in a third conditional, then would have plus past participle.'),
            ('Complete: Were it not for the outage, the team ___ the deadline. (meet)', ['would have met', '\'d have met'], 'Were it not for means if it had not been for, so use would have plus past participle.'),
            ('Complete: Unless the reviewers ___ the change soon, the release will slip. (approve)', ['approve'], 'Unless means if not, and the verb after it stays in present simple.'),
            ('Complete: Had I known the risks, I ___ the proposal. (reject)', ['would have rejected', '\'d have rejected'], 'Had I known replaces if, so the result uses would have plus past participle.'),
        ]),
        ('relative-clauses', [
            ('Complete with whose or which: The model, ___ decisions are explained, earns more trust.', ['whose'], 'Whose means of which, and it introduces a noun belonging to the model.'),
            ('Complete: Three teams, two ___ were new, shipped the feature.', ['of which'], 'Of which refers back to a part of a group that was already named.'),
            ('Complete with whom or which: The reviewers ___ the proposal evaluated were all external.', ['whom'], 'Whom is the object form for people in a defining relative clause.'),
            ('Complete with whose or which: The strategy, ___ success depends on trust, is hard to measure.', ['whose'], 'Whose shows that the success belongs to the strategy.'),
        ]),
    ],
}

# First-person structure is kept. Each prompt changes context but not task shape.
PARALLEL = {
    'first-words': 'Write two or three short sentences for a club card, stating your name, your role (such as student or worker), and your city.',
    'people-and-places': 'Write two or three short sentences about a neighbour: give their name, role and one quality.',
    'small-actions': 'Write two short sentences about your evening routine and what time you do each action.',
    'first-messages': 'Write a short introduction message to a new hobby group: share who you are, what you do and why you want to join.',
    'daily-routines': 'Write a short description of your typical weekend using at least two frequency adverbs (always, usually, sometimes or never).',
    'simple-requests': 'Write a polite message to a friend asking to borrow equipment or receive notes from a class you missed.',
    'connected-messages': 'Write a connected paragraph telling a friend about a memorable family celebration. Include where you went, two things you did and how you felt.',
    'explain-a-problem': 'Write a polite message to a course organiser reporting a problem with a classroom or online lesson, explaining its impact and saying when you are available to resolve it.',
    'experience-and-advice': 'Write an advice paragraph for someone starting at your school or workplace. Give one \'you should\' tip and one \'you shouldn\'t\' tip, each with a clear reason.',
    'clear-paragraphs': 'Write a well-structured paragraph about a recent change in a local service or club. Open with a topic sentence, contrast before and now, give a specific example and end with a summary.',
    'evidence-and-examples': 'Write a paragraph explaining how a small weekly routine improves a community or workplace. Support your claim with a realistic example including numbers or concrete details.',
    'formal-email': 'Write a semi-formal inquiry email to a volunteer coordinator or local club. Briefly introduce your background and ask two polite indirect questions about availability, costs or equipment.',
    'formal-requests': 'Write a formal three-paragraph email to a department head requesting funding for a shared resource. Quantify the problem it solves, explain the implementation schedule and propose how the team will share its value.',
    'balanced-argument': 'Write a three-paragraph analytical argument on whether employers should limit office attendance or improve commuting options first. Include a \'While..., ...\' thesis in paragraph 1, a fair concession in paragraph 2, and your rebuttal in paragraph 3.',
    'evidence-of-fit': 'Write a three-paragraph evidence-of-fit statement for a volunteer leadership role. Use Situation/Task, Action and a quantifiable Result to prove a core strength, then link the lesson to the role.',
    'motivation-and-evidence': 'Write a three-paragraph motivation statement for a research placement. Open with a specific discrepancy in your field, describe a project investigating it with measurable results and explain the advanced capability you now seek.',
    'verified-programme-fit': 'Write a three-paragraph fit statement for a professional development programme. Explain how two modules address gaps in your past work and state a concrete skill, dataset or perspective you will contribute.',
    'edit-an-application': 'Write a three-paragraph professional case narrative about a different achievement. Lead each paragraph with a direct analytical claim or action, replace vague phrases with precise verbs, and substantiate claims with metrics.',
    'synthesis-and-qualification': 'Write a three-paragraph critical essay dismantling a false dichotomy about remote collaboration or public health. Identify structural conditions, trace a second-order consequence and conclude with a synthesis.',
    'audience-and-register': 'Write a three-paragraph executive briefing recommending a foundational operational safeguard before an organisation adopts a new service. Lead with a bottom-line recommendation, translate technical mechanics into commercial risk and address the roadmap trade-off.',
    'critical-capstone': 'Write a three-paragraph critical essay distinguishing genuine expertise from superficial imitation in a different domain. Use a defined not by X but by Y distinction, a concrete contrast case and a concise synthesis.',
}

# Reading passages go beside the unchanged task. Each one is source material for that task.
# Entries: unit id -> (mode, title, read-to-write instruction, paragraphs).
READINGS = {
    'clear-paragraphs': ('summary', 'Paying without cash', 'Use one advantage and one disadvantage from the reading to build your balanced paragraph.', [
        'Many shops in Ho Chi Minh City now accept phone payments, and some small stalls have stopped taking cash altogether. Supporters say that cashless payments are fast, clean and easy to track. A customer can pay for coffee in seconds, and a shop owner can see every sale on a screen. For people who run a business, this record can make tax returns simpler.',
        'However, not everyone finds this change helpful. Older customers may not have a smartphone, and some do not trust apps with their bank details. Other people worry about network problems. When the internet is slow, a card reader may not work, and the customer must find another way to pay. Some shop owners also say that they lose a few customers who prefer to pay with notes.',
        'Experts suggest a middle path. Many cities could keep both options for several years, so that shoppers can choose the method they trust. Shops that accept both cash and digital payments may keep more customers, although they must manage two kinds of records.',
    ]),
    'evidence-and-examples': ('summary', 'Late-night scrolling and morning focus', 'Use one cause and its effect from the reading as the example in your paragraph.', [
        'Many students tell themselves that scrolling through their phones before bed is harmless. However, a small university study followed 300 first-year students for one semester. Students who used their phones after midnight reported sleeping about forty minutes less each night. As a result, many of them felt tired in morning classes and found it hard to concentrate on reading tasks.',
        'The researchers noticed a clear pattern. Students who put their phones in another room slept longer and scored higher on short attention tests. Because their sleep improved, they remembered lecture notes more easily the next day. Some students also said that the habit made them feel anxious, because messages arrived at all hours.',
        'The study does not show that phones are always harmful. It does show, however, that a simple change can help. Students who set a fixed phone-free time, such as half an hour before bed, reported better mornings within two weeks.',
    ]),
    'formal-email': ('continuation', 'Project notes: customer portal, week six', 'Use two completed milestones and the open decision from the reading in your own words. Do not copy sentences.', [
        'The design team finished the new login screens on Monday. Testers checked the screens on phones and laptops, and they found two problems on the password reset page. The developers fixed both problems by Wednesday afternoon. The data team also moved all 4,200 customer records to the new database without losing any entries.',
        'Two tasks are still open. First, the legal team has not approved the new privacy notice. Second, the support team wants a short guide for customers who cannot find the new menu. The launch date is 14 November, but the launch will move to 21 November if the privacy notice is not approved by Friday.',
        'Next steps: the project manager will send the privacy draft to the legal team on Thursday. The support team will write the guide by next Tuesday. The team needs a decision from the department head about whether the old portal can stay open for one extra week.',
    ]),
    'formal-requests': ('summary', 'Appointment backlog at the campus health centre', 'Use the bottleneck and its numbers from the reading to diagnose the problem in your first paragraph.', [
        'The campus health centre handles about 320 appointment requests each week, and nearly all of them arrive by email. Staff copy every request into a shared spreadsheet, check the student\'s timetable by phone and then send a confirmation message. This process takes about twenty-six minutes per request. Because only two administrators work on requests each morning, the queue regularly stretches to three working days.',
        'The problem is worst at the start of each semester. During the first two weeks of October, students waited an average of nine days for a first appointment, and some urgent cases were delayed even longer. Staff members report that they spend more time on phone calls than on the medical support they were hired to provide. Several students have also written complaints, saying that they could not tell whether their request had been received.',
        'The main cause is not a shortage of goodwill but a process that depends on manual checks at every step. Each request waits in line for a person to read it, search for a free slot and reply. When one administrator is absent, the whole queue slows down. The centre therefore needs a system that does not depend on one person being available at the right moment.',
        'Our team has also tested a smaller version of the process. For two weeks, one administrator used a shared request board, and the average confirmation time fell to four working hours. That result was encouraging, but it depended on one person who knew the system well, which is exactly the weakness the centre wants to remove.',
    ]),
    'balanced-argument': ('continuation', 'Exams or projects? Two ways of measuring learning', 'Use the strongest point from the reading as your concession, then answer it in your next paragraph.', [
        'Universities often assess students through final exams, yet many teachers now prefer practical projects. Each method has a clear purpose, and each method has real limits.',
        'Timed exams offer a fair, controlled test of what students know. Every student answers the same questions under the same conditions, which makes results easier to compare across classes. Exams also show whether students can recall key ideas without help, a skill that many professional licences still require. Their supporters argue that projects allow too much outside help, from family members, tutors or online tools, so the final grade may reflect support rather than ability.',
        'Projects, on the other hand, ask students to apply knowledge to a realistic problem over several weeks. They reward research, teamwork and revision, and they often produce work that employers can see. Critics, however, point out that projects can take a great deal of time and may favour students with flexible schedules or access to good equipment. Some students who struggle with exams also feel anxious when a project is their main grade.',
        'A balanced policy may combine both methods. Short exams can check core knowledge, while a larger project can test application. This mixed approach does not remove every concern, but it spreads the risk of any single method failing the students it is meant to serve.',
        'Some faculty members also raise a practical concern. Projects can be marked more consistently when rubrics are clear, but marking several hundred reports each term places a heavy load on staff, and that load may reduce the quality of feedback students receive.',
    ]),
    'evidence-of-fit': ('summary', 'Micro-fulfilment centre expansion', 'Use the company initiative in the reading as the goal you connect your experience to in paragraph one.', [
        'Northline Logistics will open its first micro-fulfilment centre in the Mekong Delta in March. The 2,000-square-metre site in Can Tho will hold fast-moving products close to local shoppers, so that orders can reach customers on the same day or the next morning. Company leaders expect the centre to cut average delivery times in the region by almost one day.',
        'The project is part of a three-year plan to bring regional stock closer to customers in six provinces. Before the opening, the operations team will run a four-week pilot with three partner shops. During the pilot, staff will track order accuracy, damaged goods and the time needed to pack each parcel. Early results will be shared with the wider team, and the final layout will change if the data shows a problem.',
        'The company is also hiring. It plans to recruit forty warehouse staff, eight shift supervisors and two data analysts. New employees will complete a training course on inventory systems and safety procedures before their first shift. Managers say that the training is designed to help local teams take ownership of daily decisions, not only to follow instructions from head office.',
        '"We want the Can Tho centre to be a model for the whole network," said Head of Operations Duc Nguyen. "The pilot will tell us what works, and our teams will help us improve it."',
        'Hiring managers at the company have asked candidates to describe how they would measure success in their first ninety days. Applicants who link their experience to clear, measurable outcomes are likely to stand out in this process.',
    ]),
    'motivation-and-evidence': ('continuation', 'Technical case: alert design after the 2024 flood season', 'Use the discrepancy in the reading as the problem you open with. Keep the figures and places consistent.', [
        'Following the 2024 flood season, the provincial disaster office reviewed why three riverside communes with working water-level sensors still recorded late evacuations. The review did not find a failure in the hardware. Sensors recorded rising water on time, and the mobile network reached nearly every household. The delay stemmed not from the absence of data, but from the way that data was translated into messages.',
        'The automated alerts reported river levels in metres above a reference line, a format that suits engineers but not families. Post-storm interviews showed that many residents did not know whether a reading of 3.8 metres meant that their street would flood within an hour. Elderly households and fishing families, who often judge risk by familiar landmarks, reacted slowly. Ward coordinators confirmed that residents usually waited for a neighbour to confirm the warning before leaving their homes.',
        'A follow-up trial in two districts tested an alternative approach. Messages referred to a local landmark, such as the school gate or the market bridge, and gave a simple instruction, such as move valuables to the second floor. Households receiving these messages left their homes an average of twenty-eight minutes earlier than households in a control group. The result suggests that the bottleneck lies in the interpretation of information rather than in its collection.',
        'Nevertheless, the trial raises a difficult question. Landmark-based messages require each commune to maintain an up-to-date map of local references, and that maintenance demands staff time which many commune offices do not have. The provincial team therefore proposes a shared template, reviewed each season by ward coordinators, so that every commune can adapt the same underlying logic to its own geography.',
        'Participants in the trial also reported that the new messages felt more trustworthy. Several residents said that a familiar landmark made them believe the warning was meant for their own street, not for the district as a whole. This finding suggests that the credibility of a message depends as much on its wording as on its accuracy. Further work is needed to test whether the effect lasts through a full season of floods. The team plans to publish the full methods next spring.',
    ]),
    'verified-programme-fit': ('summary', 'Cohort description: Urban Mobility Practice', 'Use one cross-functional conflict from the reading as the challenge you resolved, then say what you would learn from peers.', [
        'The Urban Mobility Practice cohort brings together twenty professionals from transport agencies, logistics firms, software companies and civil engineering consultancies. Participants meet every second week for ten months, and each meeting mixes sectors on purpose. A data analyst from a port authority may find herself working beside a planner from a city council, and both are expected to explain their constraints in plain language.',
        'The cohort is built around a shared project rather than a lecture series. Each group receives a real dataset from a partner city and must produce a recommendation that the city could act on within a year. Last year\'s group examined how bus routes could serve factory workers who start shifts at dawn. The most difficult part was not the technical modelling. It was agreeing on which trade-offs the city could accept, because the transport operator wanted lower costs while the labour federation wanted reliable early buses.',
        'Members often describe that conflict as the defining experience of the programme. One participant, a logistics manager, proposed a timetable that removed two loss-making routes. A planner objected, arguing that the removed routes were the only way some workers could reach clinics. Instead of choosing one side, the group tested a smaller change: a shuttle that met the first shift and fed into the existing lines. The pilot cut waiting time for the earliest workers by a quarter while keeping the operator\'s costs within budget.',
        'The programme also expects members to share their own limits. Experts in statistics are asked to explain their assumptions aloud, and engineers must justify choices that seem obvious to them. Participants leave with a clearer sense of which perspectives they bring to a group and which they must learn from others. Over the ten months, most cohort members report that they listen more carefully before they propose a solution.',
        'The programme also publishes a short reflection after each sprint, and members read the reflections of the others before the next meeting. This habit turns disagreement into a shared record, so later choices can be traced back to the reasons that shaped them. Several alumni now mentor new cohorts in their own cities.',
    ]),
    'edit-an-application': ('continuation', 'Post-mortem summary: regional inventory migration', 'Use one event from the reading to start your chain of linked sentences in paragraph two.', [
        'In March, the regional warehouse network began moving its stock records from three legacy systems to one cloud platform. The migration was planned for eight weeks and was completed in eleven. The delay did not result from software faults. It resulted from unclear ownership of product codes, which varied between depots and had never been standardised.',
        'Several events shaped the outcome. In the second week, a receiving team at the northern depot scanned pallets with an old code format, and nearly four hundred units were recorded under incorrect locations. The error went unnoticed for four days because no daily reconciliation existed. When the discrepancy surfaced, the operations team spent two weeks correcting entries by hand. That delay led directly to a revised rule: every depot would reconcile counts at the end of each shift.',
        'Those changes reduced the error rate substantially. By the final phase, the mismatch rate had fallen from six per cent to under one per cent. Staff also reported that the new dashboard made it easier to see which depot needed attention. However, the team identified two lessons. First, a migration plan must assign one owner to each data standard before any records move. Second, pilot depots should represent the most difficult conditions, not the easiest ones. The northern depot, which had the oldest equipment, would have exposed the code problem in the first week.',
        'The review board concluded that the project succeeded in its final goal but not in its schedule. Future migrations will begin with a standards audit and a reconciliation test, both completed before the first live transfer.',
        'The most useful part of the review was the list of decisions that did not appear in any system log. Several supervisors had quietly developed their own checklists for receiving and shipping, and those checklists prevented many errors that the dashboard never caught. The board recommended that every depot share its checklist in a common folder, with a named owner who updates it each quarter. Only then could the network treat local practice as shared knowledge. Without that step, the next migration would repeat the same surprises. The board expects these lessons to shape the next two migrations.',
    ]),
    'synthesis-and-qualification': ('summary', 'Two studies, one debate about remote work', 'Explain why these two studies seem to conflict, using their measures and their samples.', [
        'A widely cited survey of 1,200 office workers reported that productivity rose after employees gained two remote days each week. Participants rated their own output more highly, and managers reported fewer missed deadlines. Compelling as those figures appear, they rely almost entirely on self-reported measures collected during a single quarter, which makes it hard to separate genuine efficiency from the relief of escaping a long commute.',
        'A smaller study of four engineering teams reached the opposite conclusion. Its authors tracked code review times and the number of informal conversations between colleagues. Teams working mostly remotely took longer to review changes, and junior developers asked fewer questions. However, the sample was drawn from teams that had volunteered for the trial, and the researchers acknowledged that enthusiastic volunteers might have been more collaborative from the outset.',
        'The two bodies of evidence seem to conflict, yet they measure different things. The first study captures individual output as the worker perceives it. The second captures coordination, which is harder to see and slower to appear. Furthermore, both studies lost participants over time. Roughly one in five workers in the survey left the trial before the final round, and several engineers in the smaller study changed teams, so the remaining samples may not represent the original groups.',
        'A fair synthesis, therefore, must separate short-term output from long-term learning. Remote arrangements may raise individual productivity while quietly weakening the informal mentoring on which new staff depend. Any firm that adopts a hybrid policy should measure mentoring, onboarding time and review quality alongside output, rather than relying on a single headline figure. The debate is predicated on a question that neither study can answer alone: what kind of productivity an organisation actually wants to protect.',
        'A third account, published by a regional industry association, relied on interviews with managers rather than measurements. Its authors described confidence in remote teams, but they noted that managers often judged performance by visible activity, which may favour office workers. Taken together, these accounts show how the choice of measure shapes the conclusion. The association did not test its claims against output data.',
    ]),
    'audience-and-register': ('continuation', 'Post-mortem: checkout outage during the spring promotion', 'Use the incident facts in the reading to state the scope and impact in your first paragraph.', [
        'Between 19:40 and 20:17 on the first evening of the spring promotion, the checkout service was unavailable for thirty-seven minutes. The proximate cause was a database connection pool that reached its ceiling as order volume tripled within an hour. Approximately 14,000 shoppers saw payment errors, and an estimated 3,100 abandoned their carts. The incident cost roughly $210,000 in lost merchandise value and triggered 418 support tickets within the following day.',
        'Three systemic gaps allowed a traffic spike to become an outage. First, the team had no load test that reflected promotional traffic, so the ceiling was never measured under realistic conditions. Second, alert thresholds were configured for average latency rather than for the percentage of failed payments, meaning that the first warning arrived after customers had already reported problems. Third, the escalation rota did not include the payments provider\'s on-call contact, which delayed the vendor\'s confirmation by almost twenty minutes. None of these gaps reflected individual negligence; each reflected a process that had not kept pace with the company\'s growth.',
        'Structural guardrails should prevent a recurrence rather than rely on vigilance during future campaigns. Automated load tests should run before every promotional launch, using traffic curves drawn from previous campaigns. Alerts should track the payment failure rate directly, with a threshold that triggers before the failure becomes visible to customers. Connection pools should scale automatically within a defined limit, and the escalation rota should list every external provider with a named contact. Once these safeguards exist, the next promotion will test the system in a controlled way, not in front of paying customers.',
        'The post-mortem also examined what went well. Customer service agents followed the escalation script within minutes of the first complaint, and the engineering team restored a stable connection pool faster than in any previous incident. Those responses limited the outage to thirty-seven minutes, but they depended on individual judgement at a critical moment. Structural guardrails would reduce that dependence. Leaders should therefore treat the response as proof of skill, not as a plan. Without better guardrails, a larger promotion would face the same failure. Each safeguard should have a named owner and a review date.',
    ]),
    'critical-capstone': ('summary', 'Compound interest in the mind', 'Use the compounding metaphor from the reading to map one mechanism in paragraph two, then write your own resolution.', [
        'Few metaphors in education are as persuasive as compound interest. Money left to grow earns returns, and those returns earn returns of their own. Applied to learning, the image suggests that a small daily habit of reading, practice or review can accumulate into a remarkable advantage over several years. The metaphor is useful, but it hides a condition that the financial model takes for granted: the principal must remain intact.',
        'Consider a learner who studies English for twenty minutes each morning. In the first month, the gains feel negligible. Vocabulary returns slowly, and grammar patterns seem to slip away. Yet every retrieval session strengthens a memory trace, and every correction reshapes a habit. After a year, the learner can produce complex sentences with growing ease. The compounding happens because each practice session builds on the previous one, rather than starting from zero. Forgetting, however, works like a fee. A learner who abandons practice for three months does not simply pause the growth; the accumulated retention erodes, and the next session must rebuild what was lost.',
        'This is why the metaphor should guide the design of practice, not simply encourage persistence. Spaced review functions as a deposit schedule that protects the principal. Short retrieval tasks, scheduled before forgetting becomes severe, return more than a long cramming session that is repeated once a term. Writing adds a second layer: a learner who explains an idea in their own words converts passive recognition into productive use. Such a conversion resembles reinvesting profits rather than spending them.',
        'The metaphor also carries a warning. Compounding rewards consistency more than intensity, and it punishes the belief that a single heroic effort can replace steady practice. Learners who expect rapid visible progress often abandon the process before the curve steepens. A disciplined response is to measure growth over quarters rather than days, and to accept that the early years look flat. The mind compounds only when it keeps its capital at work.',
        'A useful test is simple. Ask whether a claim could be wrong in a way that matters. If it cannot, the claim is probably a wish rather than a strategy.',
    ]),
}

READING_BANDS = {'B1': (150, 220), 'B2': (250, 350), 'C1': (350, 500), 'C2': (350, 500)}


def utf16_offset(text, index):
    # JSON offsets use UTF-16 code units, like JavaScript string offsets.
    return len(text[:index].encode('utf-16-le')) // 2


def noticing_span(text, phrase, word):
    if text.count(phrase) != 1:
        raise ValueError(f'phrase must occur exactly once: {phrase!r}')
    inner = next(re.finditer(r'(?<!\w)' + re.escape(word) + r'(?!\w)', phrase))
    start = text.index(phrase) + inner.start()
    end = start + len(word)
    return dict(start=utf16_offset(text, start), end=utf16_offset(text, end))


def expected_targets(unit):
    return [tag for tag in dict.fromkeys(unit['grammarFocus']) if tag not in FEEDBACK_ONLY][:2]


def build_unit(unit):
    uid = unit['id']
    lesson = unit['lessons'][0]
    text = lesson['miniLesson']['modelText']
    instruction, explanation, marks = NOTICING[uid]
    spans = [noticing_span(text, phrase, word) for phrase, word in marks]
    if not 2 <= len(spans) <= 6 or len({span['start'] for span in spans}) != len(spans):
        raise ValueError(f'bad noticing spans for {uid}')
    lesson['noticing'] = dict(instruction=instruction, spans=spans, explanation=explanation)

    drills = DRILLS.get(uid, [])
    if [tag for tag, _ in drills] != expected_targets(unit):
        raise ValueError(f'drill tags for {uid} must be {expected_targets(unit)}')
    unit['transferDrills'] = [
        dict(id=f'{uid}-{tag}-{index + 1}', tag=tag, prompt=prompt, answers=answers, explanation=explanation)
        for tag, items in drills
        for index, (prompt, answers, explanation) in enumerate(items)
    ]

    first = lesson['task']
    parallel = copy.deepcopy(first)
    parallel.update(
        id=unit['lessons'][-1]['task']['id'],
        isCheckpoint=True,
        title='A new task: ' + first['title'],
        prompt=PARALLEL[uid] + SUFFIX,
    )
    unit['parallelPrompt'] = parallel

    if uid in READINGS:
        mode, title, instruction, paragraphs = READINGS[uid]
        words = len('\n\n'.join(paragraphs).split())
        low, high = READING_BANDS[unit['level']]
        if not low <= words <= high:
            print(f'READING {uid}: {words} words, need {low}-{high}')
        task = unit['lessons'][1]['task']
        task['reading'] = dict(mode=mode, title=title, instruction=instruction, text='\n\n'.join(paragraphs))
    return unit


for unit in units:
    build_unit(unit)

path = root / 'curriculum/growth.draft.json'
path.write_text(json.dumps(units, ensure_ascii=False, indent=2) + '\n')
# Review the final formatted bytes, not the Python serializer's output.
subprocess.run([str(root / 'node_modules/.bin/prettier'), '--write', str(path)], check=True, capture_output=True)
review = root / 'curriculum/growth.review.json'
review.write_text(json.dumps(dict(approved=False, contentHash=hashlib.sha256(path.read_bytes()).hexdigest(), reviewer='', reviewedAt=None, note='AI-authored draft. Review span semantics, target/level fit, alternate answers, parallel-prompt difficulty and reading tasks before approval.'), indent=2) + '\n')
print(f'Wrote {len(units)} unapproved Core units.')
