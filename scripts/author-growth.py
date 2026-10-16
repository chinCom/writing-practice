"""Rebuild unapproved growth content. Never modifies the reviewed Core source."""
import copy
import hashlib
import json
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
units = json.loads((root / 'curriculum/course.draft.json').read_text())
# Exact words chosen in the first model; offsets are computed, not guessed.
noticing = [
 ('I', 'I', 'Find the first two capital I pronouns.', 'The pronoun I always starts with a capital letter.'),
 ('is', 'is', 'Find the first two forms of be that agree with one person.', 'A singular person takes is in these present statements.'),
 ('wake', 'drink', 'Find the two verbs that describe regular actions.', 'Use the present simple for these daily routines.'),
 ('and', 'because', 'Find the words that join an extra fact and a reason.', 'And adds information; because introduces a reason.'),
 ('usually', 'always', 'Find the first two words that tell how often an action happens.', 'These frequency adverbs come before the main verb.'),
 ('Could', 'will', 'Find the two modal verbs in the request and the promise.', 'Could softens a request; will expresses the promise.'),
 ('rented', 'rode', 'Find the two finished actions in the Saturday-morning sentence.', 'Rented and rode refer to completed past actions.'),
 ('stopped', 'so', 'Find the past action and the word introducing its result.', 'Stopped reports the past event; so introduces a result.'),
 ('should', "shouldn't", 'Find the two modal verbs that give advice.', 'Should and should not give positive and negative advice.'),
 ('because', 'Overall', 'Find the reason connector and the final summary signal.', 'Because introduces a reason; overall signals a conclusion.'),
 ('which', 'yet', 'Find the relative word and the contrasting connector.', 'Which adds detail; yet introduces a contrast.'),
 ('Could', 'would', 'Find the two modal verbs that soften the requests.', 'Could and would make these requests less direct.'),
 ('will', 'will', 'Find the first two occurrences of will.', 'Will introduces planned commitments in this request.'),
 ('While', 'Nevertheless', 'Find the opening contrast and the later counterargument signal.', 'While sets up a contrast; nevertheless turns to a counterargument.'),
 ('collaborated', 'built', 'Find the two past actions describing the solution.', 'These past verbs connect the claimed skill to completed work.'),
 ('that', 'that', 'Find the first two occurrences of that.', 'Check the surrounding clauses to see what each that introduces.'),
 ('While', 'will', 'Find the contrast marker and the first will.', 'While contrasts the background with the planned learning.'),
 ('replaced', 'consolidated', 'Find the past verbs for the revision and the achievement.', 'Direct action verbs make the writer’s contribution explicit.'),
 ('When', 'Conversely', 'Find the first when and the contrast signal conversely.', 'When sets conditions; conversely contrasts the second case.'),
 ('While', 'Without', 'Find the concession marker and the conditional preposition.', 'While acknowledges a cost; without introduces a missing condition.'),
 ('but', 'Consider', 'Find the contrasting conjunction and the invitation to examine an example.', 'But qualifies a definition; consider introduces supporting analysis.'),
]
pool = {
 'capitalization': [('Rewrite with correct capitals: i live in hue.', 'I live in Hue.'), ('Rewrite with correct capitals: my friend is mai.', 'My friend is Mai.'), ('Rewrite with correct capitals: we study english.', 'We study English.'), ('Rewrite with correct capitals: on monday, i work.', 'On Monday, I work.')],
 'punctuation': [('Add the final mark: Where is the library', 'Where is the library?'), ('Add the final mark: Please close the door', 'Please close the door.'), ('Join with a comma: Yes I can help.', 'Yes, I can help.'), ('Add the final mark: I study at home', 'I study at home.')],
 'subject-verb-agreement': [('Complete: My brother ___ in a bank. (work)', 'works'), ('Complete: The students ___ ready. (be)', 'are'), ('Complete: This bus ___ near my house. (stop)', 'stops'), ('Complete: My parents ___ tea every morning. (drink)', 'drink')],
 'prepositions': [('Complete: The meeting starts ___ nine o’clock.', 'at'), ('Complete: My birthday is ___ June.', 'in'), ('Complete: We have class ___ Monday.', 'on'), ('Complete: The keys are inside the bag. They are ___ the bag.', 'in')],
 'verb-tense': [('Complete: Yesterday, we ___ a museum. (visit)', 'visited'), ('Complete: Last night, she ___ an email. (write)', 'wrote'), ('Complete: Every morning, I ___ to work. (walk)', 'walk'), ('Complete: He ___ dinner right now. (cook)', 'is cooking')],
 'connectors': [('Complete with because or but: I stayed home ___ I was ill.', 'because'), ('Complete with and or but: The room is small ___ comfortable.', 'but'), ('Complete with so or because: It was raining, ___ we took a taxi.', 'so'), ('Complete with although or because: ___ it was late, we finished the work.', 'Although')],
 'word-order': [('Put in order: usually / I / walk / to work', 'I usually walk to work.'), ('Put in order: is / my sister / a teacher', 'My sister is a teacher.'), ('Put in order: yesterday / we / played / tennis', 'We played tennis yesterday.'), ('Put in order: does / where / she / live', 'Where does she live?')],
 'modal-verbs': [('Complete with the base verb: You should ___ a break. (take)', 'take'), ('Complete with the base verb: Could you ___ the window? (open)', 'open'), ('Complete with the base verb: We must ___ on time. (arrive)', 'arrive'), ('Complete with the base verb: They might ___ late. (be)', 'be')],
 'comparatives-superlatives': [('Complete: This bag is ___ than that one. (small)', 'smaller'), ('Complete: Of the three rooms, this is the ___. (quiet)', 'quietest'), ('Complete: The train is ___ than the bus. (fast)', 'faster'), ('Complete: This is the ___ route of all. (short)', 'shortest')],
 'relative-clauses': [('Choose who or which: The nurse ___ helped me was kind.', 'who'), ('Choose who or which: The book, ___ I borrowed yesterday, is useful.', 'which'), ('Choose whose or which: The student ___ bag was lost called us.', 'whose'), ('Choose where or who: This is the school ___ I studied.', 'where')],
 'question-formation': [('Put in order: does / the course / when / start', 'When does the course start?'), ('Put in order: are / included / materials', 'Are materials included?'), ('Put in order: can / where / I / register', 'Where can I register?'), ('Put in order: is / the fee / how much', 'How much is the fee?')],
 'conditionals': [('Complete: If it rains tomorrow, we ___ inside. (stay)', 'will stay'), ('Complete: If I had more time, I ___ more. (read)', 'would read'), ('Complete: If the team ___ early, we will begin at nine. (arrive)', 'arrives'), ('Complete: If she had checked the file, she ___ the error. (notice)', 'would have noticed')],
}
# New situations preserve the first task's genre, demands and word range.
parallel_prompts = [
 'Write two or three short sentences introducing a new classmate: give their name, role and city.',
 'Write two or three short sentences about a neighbour: give their name, role and one quality.',
 'Write two short sentences about your evening routine and what time you do each action.',
 'Write a short introduction message to a new hobby group: share who you are, what you do and why you want to join.',
 'Write a short description of your typical weekend using at least two frequency adverbs (always, usually, sometimes or never).',
 'Write a polite message to a friend asking to borrow equipment or receive notes from a class you missed.',
 'Write a connected paragraph telling a friend about a memorable family celebration. Include where you went, two things you did and how you felt.',
 'Write a polite message to a course organiser reporting a problem with a classroom or online lesson, explaining its impact and saying when you are available to resolve it.',
 'Write an advice paragraph for someone starting at your school or workplace. Give one you should tip and one you should not tip, each with a clear reason.',
 'Write a well-structured paragraph about a recent change in a local service or club. Open with a topic sentence, contrast before and now, give a specific example and end with a summary.',
 'Write a paragraph explaining how a small weekly routine improves a community or workplace. Support your claim with a realistic example including numbers or concrete details.',
 'Write a semi-formal inquiry email to a volunteer coordinator or local club. Briefly introduce your background and ask two polite indirect questions about availability, costs or equipment.',
 'Write a formal three-paragraph email to a department head requesting funding for a shared resource. Quantify the problem it solves, explain the implementation schedule and propose how the team will share its value.',
 'Write a three-paragraph analytical argument on whether employers should limit office attendance or improve commuting options first. Include a While thesis, a fair concession and your rebuttal.',
 'Write a three-paragraph evidence-of-fit statement for a volunteer leadership role. Use Situation/Task, Action and a quantifiable Result to prove a core strength, then link the lesson to the role.',
 'Write a three-paragraph motivation statement for a research placement. Open with a specific discrepancy in your field, describe a project investigating it with measurable results and explain the advanced capability you now seek.',
 'Write a three-paragraph fit statement for a professional development programme. Explain how two modules address gaps in your past work and state a concrete skill, dataset or perspective you will contribute.',
 'Write a three-paragraph professional case narrative about a different achievement. Lead each paragraph with an analytical claim or action, use precise verbs and substantiate contributions with metrics.',
 'Write a three-paragraph critical essay dismantling a false dichotomy about remote collaboration or public health. Identify structural conditions, trace a second-order consequence and conclude with a synthesis.',
 'Write a three-paragraph executive briefing recommending a foundational operational safeguard before an organisation adopts a new service. Lead with your recommendation, translate mechanics into commercial risk and address the roadmap trade-off.',
 'Write a three-paragraph critical essay distinguishing genuine expertise from superficial imitation in a different domain. Use a defined not by X but by Y distinction, a concrete contrast case and a concise synthesis.',
]
excluded = set('word-choice collocation false-friend word-form register repetition cohesion paragraphing topic-sentence task-response off-topic too-short tone-formality'.split())
for index, unit in enumerate(units):
    lesson = unit['lessons'][0]
    text = lesson['miniLesson']['modelText']
    a, b, instruction, explanation = noticing[index]
    spans = []
    used = set()
    for token in (a, b):
        matches = list(re.finditer(r'(?<![\w])' + re.escape(token) + r'(?![\w])', text))
        match = next((m for m in matches if m.start() not in used), None)
        if not match:
            raise ValueError((unit['id'], token))
        used.add(match.start())
        # JSON offsets use UTF-16 code units, like JavaScript string offsets.
        spans.append(dict(start=len(text[:match.start()].encode('utf-16-le')) // 2, end=len(text[:match.end()].encode('utf-16-le')) // 2))
    lesson['noticing'] = dict(instruction=instruction, spans=spans, explanation=explanation)
    targets = [tag for tag in unit['grammarFocus'] if tag not in excluded][:2]
    unit['transferDrills'] = [dict(id=f"{unit['id']}-{tag}-{i+1}", tag=tag, prompt=prompt, answers=[answer], explanation=f"Compare your answer with the model: {answer}") for tag in targets for i, (prompt, answer) in enumerate(pool[tag])]
    first = lesson['task']
    parallel = copy.deepcopy(first)
    parallel.update(id=unit['lessons'][-1]['task']['id'], isCheckpoint=True, title='A new task: ' + first['title'], prompt=parallel_prompts[index] + ' Use a new example; do not revise or copy your unit-start response.')
    unit['parallelPrompt'] = parallel
    if unit['level'] in ('B1', 'B2', 'C1', 'C2'):
        task = unit['lessons'][1]['task']
        mode = 'summary' if index % 2 == 0 else 'continuation'
        source = ('A neighbourhood library opened a small evening study room after residents said they had no quiet place to work. The first month was busy, but volunteers noticed that some visitors needed help using the booking system. They added a paper sign-up sheet beside the online form and invited regular visitors to explain the rules to newcomers. Attendance became more varied. However, the volunteers still had to decide whether to extend opening hours or spend their limited funds on better lighting. They planned a public meeting to hear from the people who used the room least often.')
        task['reading'] = dict(mode=mode, title='The evening study room', text=source)
        task['prompt'] = ('Summarize the problem, response and remaining choice in the reading. Use your own words and do not add unsupported facts.' if mode == 'summary' else 'Continue the account after the public meeting. Explain the decision, give reasons and show a plausible consequence. Keep the people and situation consistent with the reading.')
        task['checklist'] = ['Use your own words', 'Keep the main facts consistent with the reading', 'Use the unit focus in your response']
        task.pop('frames', None)
        task['scaffold'] = 'checklist'
        task['wordBank'] = []
path = root / 'curriculum/growth.draft.json'
path.write_text(json.dumps(units, ensure_ascii=False, indent=2) + '\n')
# Review the final formatted bytes, not the Python serializer's output.
subprocess.run([str(root / 'node_modules/.bin/prettier'), '--write', str(path)], check=True, capture_output=True)
review = root / 'curriculum/growth.review.json'
review.write_text(json.dumps(dict(approved=False, contentHash=hashlib.sha256(path.read_bytes()).hexdigest(), reviewer='', reviewedAt=None, note='AI-authored draft. Review span semantics, target/level fit, alternate answers, parallel-prompt difficulty and reading tasks before approval.'), indent=2) + '\n')
print(f'Wrote {len(units)} unapproved Core units.')
