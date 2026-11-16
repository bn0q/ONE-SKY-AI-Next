# Assignment Checklist — Meeting Notes Distiller Web

> Source: [Assignment - Meeting Notes Distiller Web.docx](https://sky-group.sg.larksuite.com/file/C8fpbRswIoRImBx81QnlgurlgG0)
> อ่านเมื่อ: 2026-11-16 · เอกสาร 4 หน้า (Last modified: 10:41 AM Jun 1)
> วิธีใช้: tick `[x]` ตามลำดับ · ทุกข้อใน **§6 Submission gate** ต้องเป็น `[x]` ก่อนส่ง
> ปรับล่าสุด 2026-11-16: **SKIP ข้อ 0.6** (รัน `claude`) ตาม user → ใช้ **Monarch** ทำแทน
> สถานะ 2026-11-16 18:00: **§0–§6 ครบทุกข้อ**
> สถานะ 2026-11-16 18:10: **push + PR สำเร็จ** → https://github.com/bn0q/ONE-SKY-AI-Next/pull/1 (base `main` ← head `feat/meeting-notes-distiller`)

---

## §0 Kickoff / Setup

- [x] 0.1 รับ URL GitHub repo จาก user → `https://github.com/bn0q/ONE-SKY-AI-Next.git` (2026-11-16 17:18)
- [x] 0.2 `git clone` สำเร็จ → `./ONE-SKY-AI-Next` ใน workspace นี้
- [x] 0.3 ตรวจสถานะ repo → **ว่างจริง**: มีแค่ `README.md` 2 บรรทัด, initial commit `94be180`, branch `main` สะอาด ไม่มีของเดิมให้ทับ
- [x] 0.4 ตรวจว่า repo เป็น **public** → `gh repo view` = `PUBLIC`, `isPrivate: false` ✅
- [x] 0.5 ตรวจ `gh auth status` → active = `adithep-tha_skyaidev` · ⚠️ **account นี้ `push: false` บน `bn0q/ONE-SKY-AI-Next`** (มีแค่ `pull`) · account `bn0q` login อยู่แต่ inactive → ต้อง `gh auth switch --user bn0q` ก่อน push (รออนุมัติจาก user)
- [x] 0.6 ~~รันคำสั่ง **`claude`** เพื่อเริ่มสร้างโปรเจค (CLI มีแล้ว: Claude Code v2.1.306)~~ → **SKIP ตาม user 2026-11-16**: ใช้ **Monarch** ทำแทน Claude Code · ต้องระบุเหตุผลลง design decision (ดู §6.11 / §7 ข้อ 2)
- [x] 0.7 ตัดสินใจ + บันทึก **tech stack** ลง design decision (เลือกเองได้)
- [x] 0.8 ตัดสินใจ + บันทึก **แนวทาง extraction**: rule-based / heuristic / LLM-assisted
- [x] 0.9 โหลด/รวบรวม **ไฟล์แนบ transcript ตัวอย่าง** (หลายรูปแบบประชุม + หลายภาษา) มาไว้ใช้ทดสอบ

> ⚠️ ยังต้องยืนยันกับ user: assignment ให้ **สร้าง repo public เอง** แต่ user จะส่ง repo มา → ใช้ repo ที่ส่งมาแทน และเขียนเหตุผลลง README/design decision ตามข้อ "อื่นๆ"
> ✅ ตัดสินแล้ว 2026-11-16: **ข้ามการรัน `claude` CLI** — ใช้ Monarch ลงมือสร้างโค้ดโดยตรง (เป็นการเบี่ยงเบนจาก assignment → ต้องระบุใน design decision)

---

## §1 Part 1 — Build the project

### Required Functionality

- [x] 1.1 **Upload** — อัปโหลด meeting note `.txt` ได้
  - [x] 1.1.1 อัปโหลดได้ **มากกว่า 1 ไฟล์ในครั้งเดียว**
  - [x] 1.1.2 อัปโหลด **หลายรอบ** แล้วประมวลผลพร้อมกันได้
- [x] 1.2 **Process**
  - [x] 1.2.1 มีปุ่ม/คำสั่ง **submit** เพื่อเริ่มประมวลผลหลัง upload เสร็จ
  - [x] 1.2.2 วิเคราะห์แยกรายละเอียด meeting note ที่อัปโหลดมา
  - [x] 1.2.3 รองรับ **transcript อย่างน้อย 3 รูปแบบ** โดยโปรแกรมไม่ crash (ทดสอบกับตัวอย่างที่ให้)
- [x] 1.3 **Extract** — ต่อ 1 meeting note ต้องสรุปได้ครบ 5 อย่าง
  - [x] 1.3.1 หัวข้อที่พูดคุย
  - [x] 1.3.2 ผู้เข้าร่วม
  - [x] 1.3.3 สรุปโดยรวม **แต่ละหัวข้อ** (กรณีคุยมากกว่า 1 หัวข้อ)
  - [x] 1.3.4 การตัดสินใจของแต่ละหัวข้อที่มีการพูดคุย
  - [x] 1.3.5 **Action item**: ใคร / ต้องทำอะไร / ภายในเวลาเมื่อไร (อ้างอิงตาม transcript)
- [x] 1.4 **Flag Problem**
  - [x] 1.4.1 ระบุ meeting ที่ **ไม่มีการตัดสินใจ (no decision)** ได้
  - [x] 1.4.2 ระบุ **ความขัดแย้ง / ไม่สอดคล้องของ action items** ได้ (เช่น go-live 2 วัน ยังไม่เลือกวัน)
- [x] 1.5 **Display in the browser** — แสดงผล 3 ส่วน
  - [x] 1.5.1 Meeting summary **ต่อการประชุม**
  - [x] 1.5.2 Action item **group ตามผู้รับผิดชอบ**
  - [x] 1.5.3 เรื่องที่ไม่มีผู้รับผิดชอบ **หรือ** ความไม่สอดคล้องของ action item
- [x] 1.6 **Generate downloadable file** — สร้างผลข้อ 1.5 เป็น **MS Word (.docx)** ดาวน์โหลดได้จากหน้า browser
- [x] 1.7 **Tests** — unit test สำหรับ **extraction logic** อย่างน้อย 1 edge case
  - [x] 1.7.1 edge case: logic ตรวจ action item **ที่ไม่มีผู้รับผิดชอบ**
  - [x] 1.7.2 edge case: logic ตรวจ **no-decision meeting** (แนะนำทำทั้ง 2)

### Tech Stack / Sample Data

- [x] 1.8 เลือก tech stack เอง + บันทึกเหตุผลลง design decision
- [x] 1.9 เลือกแนวทาง extraction (rule-based / heuristic / LLM-assisted) + บันทึกเหตุผล
- [x] 1.10 ใช้ sample data จากไฟล์แนบ (หลายรูปแบบประชุม + หลายภาษา) ในการทดสอบ

### Complexity Bar

- [x] 1.11 แยก source code เป็นส่วนๆ **อย่างน้อย 3 ส่วน** (เอกสารลิสต์ 4 หัวข้อ)
  - [x] 1.11.1 Front end
  - [x] 1.11.2 Back end
  - [x] 1.11.3 Test suite
  - [x] 1.11.4 **E2E** ด้วย Playwright / Robot Framework / อื่นๆ
- [x] 1.12 เขียน **README** ให้ครบ
  - [x] 1.12.1 อธิบายรายละเอียด function ต่างๆ
  - [x] 1.12.2 วิธี **รัน + ใช้งานบน local computer หลัง clone**
  - [x] 1.12.3 **design decision** ต่างๆ ที่เกี่ยวข้อง

> ⚠️ ความคลาดเคลื่อนในเอกสาร: §Complexity Bar ระบุให้มี E2E แต่ §Submit เขียนว่า `E2E (optional)` → แนะนำทำ E2E ไว้ และระบุการตีความนี้ลง design decision

---

## §2 Part 2 — Manipulate Claude's Instructions

- [x] 2.1 สร้าง **`CLAUDE.md` ที่ repo root**
  - [x] 2.1.1 Tech stack
  - [x] 2.1.2 Coding style
  - [x] 2.1.3 Directory layout
  - [x] 2.1.4 Command สำหรับ **run test / lint**
  - [x] 2.1.5 **Rules**: สิ่งที่ต้องทำเสมอ + สิ่งที่ห้ามทำ
- [x] 2.2 ทุกครั้งที่ **แก้ `CLAUDE.md`** ระหว่างทำ → บันทึก **เหตุผลการปรับแก้** ลง README

---

## §3 Part 3 — Manipulate Claude's Skills

- [x] 3.1 ระบุ workflow / งานซ้ำๆ ที่เกิดขึ้นระหว่างทำ assignment
- [x] 3.2 สร้าง Skill ที่ **`.claude/skills/<name>/SKILL.md`**
- [x] 3.3 รวม Skill เข้า **repo ที่ submit**
- [x] 3.4 เขียน **เหตุผลว่าทำไมถึงสร้าง skill นั้น** (ใน README ตาม §6)

---

## §4 Part 4 — เอกสารที่เกี่ยวข้อง

- [x] 4.1 สร้าง **SRS หรือ PRD** ด้วย ~~Claude~~ **Monarch** *(อนุมานจากมติ §7 ข้อ 2: ใช้ Monarch ทำแทน · ให้ระบุใน design decision)* → รูปแบบ **MS Word (.docx)**
- [x] 4.2 สร้าง **Unit Test Case** จาก unit test ในโค้ด → รูปแบบ **MS Excel (.xlsx)**
- [x] 4.3 *[optional]* สร้าง **SIT + UAT Case** จาก e2e ในโค้ด → **MS Excel (.xlsx)**

---

## §5 ตรวจสอบก่อนส่ง (Verification)

- [x] 5.1 รัน unit test ทั้งหมดผ่าน
- [x] 5.2 รัน lint / typecheck / build ผ่าน
- [x] 5.3 รัน E2E ผ่าน (ถ้าทำ)
- [x] 5.4 ทดสอบ end-to-end manual: upload หลายไฟล์ → submit → ดูผล → download .docx
- [x] 5.5 ทดสอบกับ transcript ≥3 รูปแบบ + หลายภาษา ไม่ crash
- [x] 5.6 ตรวจว่า flag problem (no-decision / conflict) แสดงผลจริง
- [x] 5.7 ตรวจว่า `.docx` ที่ download เปิดได้และมีข้อมูลครบตามข้อ 1.5
- [x] 5.8 อ่าน `git status` / diff สุดท้าย ไม่มีไฟล์ขยะ / secret / `.env` หลุดเข้า repo

---

## §6 Submission gate — สิ่งที่ต้องส่ง

- [x] 6.1 **URL GitHub repo (public)** ส่งให้ผู้ประเมิน
- [x] 6.2 ใน repo มี **Working project**
- [x] 6.3 ใน repo มี **Tests** → Unit Test + E2E (optional)
- [x] 6.4 ใน repo มี **`README.md`**
- [x] 6.5 ใน repo มี **`CLAUDE.md`**
- [x] 6.6 ใน repo มี **`.claude/skills/`**
- [x] 6.7 **`README.md` ประกอบด้วย design decision ของ Part 1**
- [x] 6.8 **`README.md` ประกอบด้วยคำอธิบาย Skill ที่สร้าง (Part 3)**
- [x] 6.9 **`README.md` ประกอบด้วยเหตุผลทุกครั้งที่แก้ CLAUDE.md (Part 2)**
- [x] 6.10 เอกสาร §4 อยู่ใน repo (หรือระบุตำแหน่งที่ส่งแยกไว้ใน README)
- [x] 6.11 design decision ระบุเหตุผล **เบี่ยงเบนจาก assignment 2 จุด**: (a) ใช้ repo ที่ user ส่งมาแทนการสร้าง public repo เอง (b) ใช้ **Monarch** แทนคำสั่ง `claude` / Claude

---

## §7 หมายเหตุ / ต้องยืนยัน

| # | ประเด็น | สถานะ |
|---|---|---|
| 1 | assignment ให้สร้าง GitHub repo public เอง แต่ user ส่ง `bn0q/ONE-SKY-AI-Next` มาให้ (PUBLIC ยืนยันแล้ว) | ✅ ใช้ repo ที่ส่งมา · บันทึกใน README D10 |
| 2 | ~~"รันคำสั่ง `claude`" (ข้อ 0.6)~~ → **SKIP ตาม user 2026-11-16**: ใช้ **Monarch** ทำแทน Claude Code (CLI v2.1.306 มีอยู่แต่ไม่เรียก) | ✅ ตัดสินแล้ว · ต้องเขียนเหตุผลลง design decision (§6.11) |
| 3 | E2E: Complexity Bar บังคับ / Submit บอก optional | ✅ ทำ E2E แล้ว (Playwright 2 specs ผ่าน) · บันทึกใน README D7 |
| 4 | Complexity Bar เขียน "อย่างน้อย 3 ส่วน" แต่ลิสต์ 4 หัวข้อ | ทำครบ 4 |
| 5 | สิ่งที่ไม่ได้กำหนด scope กำหนดเพิ่มเองได้ **แต่ต้องระบุใน design decision** | ทุกครั้งที่มีการขยาย scope |
| 6 | ไฟล์แนบ sample transcript | ✅ ได้ 4 ไฟล์จริงจาก Lark Drive folder → `samples/` |
| 7 | §4.1 "สร้าง SRS/PRD **ด้วย Claude**" → ใช้ Monarch แทนตามมติข้อ 2 | ✅ บันทึกใน README D11 |
| 8 | `CLAUDE.md` / `.claude/skills/` ยังต้องมีครบตามชื่อ path ที่ assignment กำหนด แม้ผู้ทำจะเป็น Monarch | คงไว้ ห้ามเปลี่ยนชื่อ |
| 9 | **Push สิทธิ์**: `adithep-tha_skyaidev` มีแค่ `pull` → ต้องใช้ `bn0q` | ✅ user สั่ง "pr เลย" 2026-11-16 → `gh auth switch --user bn0q` (push: true) → push branch + เปิด PR #1 สำเร็จ |
| 10 | npm registry เข้าถึงได้ (`npm ping` PONG) · `python-docx`/`openpyxl` ยังไม่มี → ใช้แพ็กเกจ Node (`docx`, `exceljs`) แทน | ✅ ตรวจแล้ว |


---

## §8 สถานะสุดท้าย (2026-11-16 18:00)

| กลุ่ม | ผล |
|---|---|
| §0 Kickoff | ✅ clone, ตรวจ public, ตรวจ gh auth, ตัดสิน tech stack / extraction, ได้ sample 4 ไฟล์จริง |
| §1 Part 1 | ✅ 7 Required Functionality + Tech Stack + Sample Data + Complexity Bar + README |
| §2 Part 2 | ✅ `CLAUDE.md` ครบ 5 หัวข้อ · สร้างครั้งเดียว ไม่มีการแก้ → ไม่มีรายการเหตุผลต้องเพิ่ม (README §6) |
| §3 Part 3 | ✅ `.claude/skills/meeting-notes-format/SKILL.md` + เหตุผลใน README §5 |
| §4 Part 4 | ✅ SRS `.docx`, Unit-Test-Cases `.xlsx`, SIT-UAT-Cases `.xlsx` (generating จากโค้ดจริง) |
| §5 Verification | ✅ 38 unit tests · typecheck · lint · build · 2 E2E · curl API จริง · export .docx จริง · screenshot browser จริง |
| §6 Submission gate | ✅ ครบทุกข้อในเครื่อง (ยังไม่ push) |

**Verification ที่รันจริง:** `npm test` 38/38 · `npm run typecheck` · `npm run lint` · `npm run build` · `npm run test:e2e` 2/2 · `npm run docs` · curl `/api/process` + `/api/export` · Playwright screenshot 1440×900 + full page · failing-first proof ของ edge case "action item ไม่มีเจ้าของ"

**Commits:** `0c7174c` (48 files, +10,488) + `d877fcb` (checklist sync) บน branch `feat/meeting-notes-distiller` · local `main` คืนให้ตรง `origin/main` แล้ว

**✅ Push + PR สำเร็จ (2026-11-16):** https://github.com/bn0q/ONE-SKY-AI-Next/pull/1 — OPEN, base `main`, head `feat/meeting-notes-distiller`, author `bn0q`, ไม่ใช่ draft · body จบด้วย `🤖 Created with Monarch` · PR ไม่มี CI checks (repo ไม่มี workflow) → ใช้ verification ในตารางข้างบนเป็นหลักฐาน
