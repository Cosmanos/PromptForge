# PromptForge – DesignQA.md (Raw)

This document captures the original design questions and the user’s direct answers with minimal transformation.

---

## 1. Who is the primary user for MVP?

**Options:**

* A) Devs building reusable prompts (like you)
* B) Non-technical users trying to get better results
* C) Teams building internal tools

**Pick ONE for MVP.**

**Answer:**
For the final version I want this to be for people that don't know how to build a promt to give sugestions. Basically like you have for customer sucess some indication on what to do next. For this MVP its gonna be for me at first and then see how the product shifts.

---

## 2. What is the pain right now?

**Answer:**
I don't know what makes a good promt and even if I do I really need to think about it. Also paraterize is another big one.

---

## 3. What is the main success metric?

**Options:**

* Fewer retries?
* Better first response?
* Reusability?
* Speed?

**Answer:**
Reusability and Better first response

---

## 4. How are variables created?

**Options:**

* A) Only manually typed `{{variable}}`
* B) Auto-suggested by system
* C) Both

**Answer:**
No variables are manually creaetd for now. The user Types {{variable}} and the app will detect that as a variable. This will be automatic at some point but for now it shoudl work on user clicks validate.

---

## 5. Variable types?

**Answer:**
Onloy text for now, other types later.

---

## 6. How are variables used in builder and execution?

**Answer:**
In the prompt from builder it shows {{variable}} in design. The user has the form generated maybe at the top or sidebar. The user adds default values for the variable. You have a preview or call button, this will take the default values and replace them into {{variables}}.

---

## 7. Validation vs Execution behavior?

**Answer:**
So we have execution/validation. You build a promt. You validate. THis is the step that generates tags anbd suggestions for the promt. For the validation, think of {{variables}} like inputs for a function in code. When you do static code analyses you don't need actual data for the function. You analyse the code. Int he same way the app does not analyse the default values for the variables, it analyses just the prompt without dynamic parts. You also have execution. Think of it like a test case. The user wnat to see what that promt will respond with a certain values provided. When executing you also replace the {{varialbes}} sections.

---

## 8. What are tags?

**Answer:**
So tags are properties to be adjusted for the prompt. Like search online, structured output, be really critical. Think people say when they say prompt engineering. This are the tags on top of the chat. Like Research mode in ChatGpt. Whjen the user selects some and hits rewrite, based on which tags the user selected the users promt will be rewritten to include some on the tags. The idea is to use that promt in other apps so the modification should written directly in the prompt without assuming the LLM which will use the prompt has any context related to the tags. These need to be included naturally int he users prompt.

---

## 9. Where do tags come from?

**Answer:**
For the MVP predefined. We will have a special context for the LLM that does the validation. This is actually the bread and butter of the app but for now just simple ideas. Maybe in the future the LLM can propose its own tags but for now just a predefined set as demo.

---

## 10. Can users create their own tags?

**Answer:**
Yes later the user could propose their own tags.

---

## 11. Tag conflicts?

**Answer:**
Good question we will answer it later. Not MVP but maybe the tags can be mutually exclusive. You select Short answer you cant select detailed explanation, like some traits work in games.

---

## 12. Validation flow?

**Answer:**
You click Validate prompt, The LLM suggests tags on top of the chat window or bellow, validate UX after. User selects tags. User clicks Rewrite/Rebuild prompt. LLM rebuilds prompt.

---

## 13. What does Rewrite do?

**Answer:**
Rewrite the entire prompt. Should be based on the users one.

---

## 14. Editing behavior and versions?

**Answer:**
Both. The user can both modify the original one or the resulted rewrite. If it modifies the original one the rebuild gets disabled/grayed out to should its out of date. IF the user modifies the resulting one its ok, it gets saved.

Yes both should be tracked but they are dependent. You go back on the original one, the rewriten one also goes back. We will think about it more in the future but for now just a normal back for original validated should be enough.

---

## 15. What gets saved in a prompt?

**Answer:**
Everything. Save model + variables + resulted prompt + tags used.

---

## 16 & 17. Builder vs Execution modes?

**Answer:**
Here I want to clarify something. You have 2 modes in app. Prompt builder and Prompt execution.

In prompt builder you build the prompt, you set up variables, you get the validation, etc. Here you can also call the finalized prompt for testing.

But you also have prompt execution. This is a separate screen in app. In prompt builder you create the prompt. In prompt execution you select previously built prompts and then you see the form with the added {{Variables}} as separate fields. Add data for each field and either call the prompt directly in app or copy it to add it in another app. The response from the LLM should start a new chat and each section of the response should copyable. Actually the app should ahve text blocks. Like write x for me. THen teh LLm should give formated responses that in teh app copuld be copied.

---

## 18. Chat behavior?

**Answer:**
More details above. and yes for the builder change promt state, chat resets. In the future we might save all of the chats linked to the promt version but honeslty I cant tell why a user would need that.

---

## 19. Execution history?

**Answer:**
We should have history for Execution. Maybe have a chat in execution screen with all history chats.

---

## 20. LLM providers?

**Answer:**
Open AI only seems ok for now.

---

## 21. Model selection?

**Answer:**
Part of the prompt editor. But think about it later.

---

## 22. Prompt correction system?

**Answer:**
Hardcoded system for now. Configuration later.

---

## 23. Main UI structure?

**Answer:**
The main screen of the app will be a list of the prompts that you already have created.
These should be displayed in a grid style with a search box at the top. New prompt will be the first option. Each of the prompts will have multiple buttons added. In the image I've attached an example design from another app I created. These should have Execute, Edit and delete on them. The first option form the list will be create a new prompt.

You click that. You have a back button and a name field at top right. A chat prompt bubble like in Open AI in the middle. You start to write. Add {{variables}}. On the button of the prompt bubble you have Analyze and Try out. The user hits Analyze. That triggers the validation step, the buttons becomes green or something to indicate it has been perfomed, loading while the LLM thinks, check mark once done. The LLM validates the prompt. At the top of the promt bubble tags get populated. THe user selects the ones he thinks are required, they are checked. On the right side of the tags theres a rewrite button, once the user has modified the tags breakdown that button is highlighted. The LLM again thinks, the button shows a loading, and when its finished it will completely rewrite the prompt.
The user can hit Try it out and the LLM response to the actual user prompt (with the variables) will be populated at the button of the prompt bubble. The user modifies the prompt bubble, this response gets disabled..

Now for variables I want something a bit weird so bear with me. When the user types {{variable}} the text will be converted into a cartridge UI element. This element will have an expand button, the name of the variable, edit and delete. This cartridge will be colored. If the user press expand then in the prompt will be split in two. First part will be until the line where the {{variable}} is present, then another text bubble with a multiline fields for including the default values, then the rest of the prompt. This can happen multiple times. The user can do this multiple times, have multiple {{variable}} expanded. The user can hide this in which case this will go back to the cartridge design. Each {{variable}} should have a predefined color, something colorful given by the system and the default chat bubble/field should have the same color. The edit button on the cartridge just makes the name of the variable editable so that you can change it if you want, and the remove button will just delete the variable.

Going back to execution. You go back to the main screen. For a previously created promt you hit Run. You are taken to a form where you can see all of the Variables that you specified in the builder. You complete those with your needed variables and then hit execute at the button of the screen. This will imidiatly start a new chat window in which you cna continue to talk.

---

## 24. Design style?

**Answer:**
Notion. Something simple UX wise.

---

## 25. Primary object in system?

**Answer:**
A promt template that can be used later.
