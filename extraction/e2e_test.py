import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
SHOT_DIR = r"D:\Provisoire\extraction\screenshots"
import os
os.makedirs(SHOT_DIR, exist_ok=True)

errors = []

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 480, "height": 900})
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: errors.append(str(exc)))

        page.goto(BASE, wait_until="networkidle")
        page.wait_for_selector("text=PROVISOIRE EXAM SIMULATOR")
        page.screenshot(path=f"{SHOT_DIR}/01_dashboard.png")
        print("Dashboard loaded OK")

        # Start Exam
        page.click("text=Start Exam")
        page.wait_for_selector("text=Question 1 / 20")
        page.screenshot(path=f"{SHOT_DIR}/02_exam_q1.png")
        print("Exam started, Q1 shown")

        # answer first 3 questions, checking feedback coloring appears
        for i in range(3):
            page.wait_for_selector(".option")
            page.click(".option >> nth=0")
            page.wait_for_selector(".option-correct, .option-wrong")
            if i == 0:
                page.screenshot(path=f"{SHOT_DIR}/03_after_answer.png")
            next_btn = page.query_selector("text=Next") or page.query_selector("text=Finish")
            assert next_btn, "no next/finish button appeared"
            next_btn.click()
            page.wait_for_timeout(150)
        print("Answered 3 questions with visible feedback + Next works")

        # jump ahead: answer remaining 17 quickly to reach results
        for i in range(17):
            page.wait_for_selector(".option")
            page.click(".option >> nth=0")
            page.wait_for_selector(".option-correct, .option-wrong")
            btn = page.query_selector("text=Next") or page.query_selector("text=Finish")
            btn.click()
            page.wait_for_timeout(80)

        page.wait_for_selector("text=SCORE")
        page.wait_for_timeout(600)  # let confetti/banner render
        page.screenshot(path=f"{SHOT_DIR}/04_results.png")
        print("Reached results screen after 20 questions")

        # Review answers
        page.click("text=Review Answers")
        page.wait_for_selector(".review-list")
        page.screenshot(path=f"{SHOT_DIR}/05_review.png")
        print("Review answers panel opened")

        # Start another exam (fresh random set)
        page.click("text=Start Another Exam")
        page.wait_for_selector("text=Question 1 / 20")
        print("Start Another Exam produced a fresh session")

        # go back to dashboard, check stats updated, then try Wrong Questions
        page.goto(BASE, wait_until="networkidle")
        page.wait_for_selector("text=PROVISOIRE EXAM SIMULATOR")
        page.screenshot(path=f"{SHOT_DIR}/06_dashboard_after.png")
        wrong_btn = page.query_selector("text=Wrong Questions")
        assert wrong_btn is not None
        is_disabled = wrong_btn.is_disabled()
        print(f"Wrong Questions button disabled={is_disabled}")
        if not is_disabled:
            wrong_btn.click()
            page.wait_for_selector("text=Question 1")
            page.screenshot(path=f"{SHOT_DIR}/07_wrong_questions.png")
            print("Wrong Questions mode launched OK")

        browser.close()

    if errors:
        print("\n--- CONSOLE/PAGE ERRORS ---")
        for e in errors:
            print(e)
        sys.exit(1)
    else:
        print("\nNo console/page errors detected.")

if __name__ == "__main__":
    run()
