<img width="1280" height="640" alt="img" src="https://github.com/user-attachments/assets/4d02c5a7-60eb-4705-b812-86cc9d6a73e5" />

# 🌊 Visco: The Speed Bump for Your Brain
AI based extension for avoiding doomscrolling.

## Basic Details

### Team Name: SheCodes

## Team Members
- Member 1 : Aarya Prasad - Muthoot Institude of Technology and Science
- Member 2 : Niranjana Rajesh - Muthoot Institude of Technology and Science

## Hosted Project Link
Video link here 👉🏼 :<https://drive.google.com/file/d/12vi5icgUX9JNQmQMbjX236xUQJ2-e8TQ/view?usp=drive_link>

## Project Description
Visco is a lightweight Chrome extension that introduces progressive friction to high-distraction websites. Instead of hard blocking content, it gradually increases visual blur and scroll delay after extended usage. The goal is to build awareness, encourage intentional browsing, and reduce unconscious doomscrolling.

## Problem Statement
Hard blockers often trigger frustration and rebound behavior. Users either disable them or binge later. There is currently no subtle, psychologically aware system that gently increases effort instead of restricting access.
Digital overconsumption happens not because of lack of discipline — but because of frictionless design.

## The Solution
Visco introduces progressive friction:
- After 15 minutes of active usage on distracting domains, the page gradually becomes harder to consume.
- Visual blur and grayscale effects increase over time.
- Scroll events are throttled, adding intentional effort.
- Restrictions automatically lift after a short break.
Instead of locking the door, Visco makes you choose whether it's worth staying.

## Technical Details

### Technologies / Components Used

#### For Software:
- Languages Used: JavaScript (ES6), CSS
- Frameworks Used: None (Vanilla implementation)
- Libraries Used: None (Lightweight by design)
- Tools Used: VS Code, Git, Chrome Developer Tools

#### For Hardware:
Not applicable – software-only project.

## Features
1️⃣ Progressive Viscosity
- After 15 minutes of active use:
- CSS filters apply: blur() and grayscale()
- Scroll delay increases gradually (0ms → 1000ms)

2️⃣ The Cool Down
If the user leaves the tab for 5 minutes:
- Effects automatically reset
- Friction returns to zero

3️⃣ Lightweight by Design
- No tracking
- No analytics
- No backend
- No heavy frameworks
Privacy-first, minimal footprint.

## Implementation
### For Software
### Installation (Development Mode)
1.Clone this repository:
git clone https://github.com/Niranjana-11/VISCO.git

2.Open Chrome or Edge:
chrome://extensions/

3.Enable Developer Mode (top right).
4.Click Load Unpacked.
5.Select the Visco project folder.
6.Start browsing

### Run
No server required.
Once loaded, Visco runs automatically in the background as a Chrome Extension (Manifest v3 service worker).

## Project Documentation
Screenshots 
<img width="1920" height="1080" alt="Parental control timer" src="https://github.com/user-attachments/assets/6a96f99b-687d-4a25-b852-8043bf93ba26" />
Caption:Parental Control with password

<img width="1920" height="1080" alt="Screen Blur" src="https://github.com/user-attachments/assets/82deebb9-fdfb-45df-80ef-8d2453bb7bef" />

Caption: Image blurring after a given timer.

## Project Demo
Video:
<https://drive.google.com/file/d/12vi5icgUX9JNQmQMbjX236xUQJ2-e8TQ/view?usp=drive_link>

## AI Tools Used (Transparency)
### Tools Used
- ChatGPT – Code review assistance, README refinement, debugging suggestions
- Google Gemini – Logic brainstorming and idea exploration
- Perplexity AI – Quick research and validation of implementation approaches
- Claude – Alternative logic structuring and architectural thinking

### Purpose of AI Usage
AI tools were used strictly for:
- Brainstorming feature logic
- Reviewing JavaScript structure
- Refining documentation
- Exploring alternative implementation patterns

No auto-generated full project code was directly deployed without manual understanding and modification.

### Human Contributions
Core concept design and behavioral philosophy
- Extension architecture planning
- DOM manipulation and scroll throttling logic
- Implementation of progressive viscosity system
- Educational domain detection logic
- UX decisions and feature tuning
- Integration and testing

## License
This project is licensed under the MIT License.
MIT License allows:
- Commercial use
- Modification
- Distribution
- Private use







