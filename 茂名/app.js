// 刷题应用主逻辑
class QuizApp {
    constructor() {
        this.initStorage();
        this.currentPage = 'home';
        this.previousPage = 'home';
        this.quizState = null;
        this.timer = null;
        this.filters = { year: 'all', type: 'all' };
        this.init();
    }

    // 初始化本地存储
    initStorage() {
        const defaults = {
            answers: {},      // 做题记录 {questionId: {userAnswer, isCorrect, timestamp}}
            wrongBook: [],    // 错题本 [questionId]
            history: [],      // 历史记录 [{id, examId, examName, mode, score, total, correct, wrong, time, timestamp, answers: {}}]
            stats: {          // 统计数据
                totalAnswered: 0,
                correctCount: 0,
                practiceDays: [],
                examCount: 0
            }
        };

        for (let key in defaults) {
            if (!localStorage.getItem(`quiz_${key}`)) {
                localStorage.setItem(`quiz_${key}`, JSON.stringify(defaults[key]));
            }
        }
    }

    // 存储数据
    setStorage(key, value) {
        localStorage.setItem(`quiz_${key}`, JSON.stringify(value));
    }

    // 获取数据
    getStorage(key) {
        return JSON.parse(localStorage.getItem(`quiz_${key}`) || 'null');
    }

    // 初始化应用
    init() {
        this.renderHome();
        this.updateStats();
    }

    // 显示Toast提示
    showToast(message, duration = 2000) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), duration);
    }

    // 显示模态框
    showModal(content) {
        document.getElementById('modal-content').innerHTML = content;
        document.getElementById('modal-overlay').classList.add('open');
    }

    // 关闭模态框
    closeModal() {
        document.getElementById('modal-overlay').classList.remove('open');
    }

    // 切换页面
    showPage(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${pageId}`).classList.add('active');
        this.currentPage = pageId;

        // 更新底部导航状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === pageId || 
                (pageId === 'home' && item.dataset.page === 'home') ||
                (pageId === 'wrong' && item.dataset.page === 'wrong') ||
                (pageId === 'profile' && item.dataset.page === 'profile')) {
                item.classList.add('active');
            }
        });
    }

    // 底部导航切换
    switchTab(tab) {
        this.previousPage = this.currentPage;
        switch(tab) {
            case 'home':
                this.goHome();
                break;
            case 'wrong':
                this.goToWrongBook();
                break;
            case 'profile':
                this.goToProfile();
                break;
        }
    }

    // 返回上一页
    goBack() {
        if (this.previousPage === 'quiz') {
            this.confirmExit();
        } else {
            this.showPage(this.previousPage === 'home' ? 'home' : this.previousPage);
        }
    }

    // 返回首页
    goHome() {
        this.showPage('home');
        this.renderHome();
        this.updateStats();
    }

    // 渲染首页
    renderHome() {
        const examList = document.getElementById('exam-list');
        examList.innerHTML = QUESTION_BANK.exams.map(exam => `
            <div class="card p-4 mb-3 cursor-pointer" onclick="app.showModeSelector('${exam.id}')">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <h3 class="font-medium text-gray-800">${exam.name}</h3>
                        <p class="text-sm text-gray-500 mt-1">
                            <span class="mr-3">📝 ${exam.totalQuestions}题</span>
                            <span>⏱ ${exam.duration}分钟</span>
                        </p>
                    </div>
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </div>
            </div>
        `).join('');
    }

    // 更新统计数据
    updateStats() {
        const stats = this.getStorage('stats') || { totalAnswered: 0, correctCount: 0, practiceDays: [], examCount: 0 };
        const wrongBook = this.getStorage('wrongBook') || [];

        document.getElementById('stat-total').textContent = stats.totalAnswered;
        document.getElementById('stat-correct').textContent = stats.correctCount;
        document.getElementById('stat-wrong').textContent = wrongBook.length;

        // 个人页统计
        const totalDays = stats.practiceDays.length;
        const accuracy = stats.totalAnswered > 0 ? Math.round(stats.correctCount / stats.totalAnswered * 100) : 0;
        document.getElementById('profile-days').textContent = totalDays;
        document.getElementById('profile-total').textContent = stats.totalAnswered;
        document.getElementById('profile-accuracy').textContent = accuracy + '%';
        document.getElementById('profile-exams').textContent = stats.examCount;
    }

    // 显示模式选择
    showModeSelector(examId) {
        const exam = QUESTION_BANK.getExamById(examId);
        this.showModal(`
            <h3 class="text-lg font-bold mb-4">选择模式</h3>
            <div class="space-y-3">
                <button onclick="app.startQuiz('${examId}', 'practice')" class="w-full p-4 bg-blue-50 rounded-xl flex items-center">
                    <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                        </svg>
                    </div>
                    <div class="text-left">
                        <div class="font-medium text-gray-800">做题模式</div>
                        <div class="text-sm text-gray-500">答完一题显示答案解析</div>
                    </div>
                </button>
                <button onclick="app.startQuiz('${examId}', 'exam')" class="w-full p-4 bg-orange-50 rounded-xl flex items-center">
                    <div class="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mr-4">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <div class="text-left">
                        <div class="font-medium text-gray-800">考试模式</div>
                        <div class="text-sm text-gray-500">限时${exam.duration}分钟，交卷后显示成绩</div>
                    </div>
                </button>
            </div>
            <button onclick="app.closeModal()" class="w-full mt-4 py-3 text-gray-500">取消</button>
        `);
    }

    // 显示练习选择器（底部练习按钮）
    showPracticePicker() {
        this.previousPage = this.currentPage;
        let examOptions = QUESTION_BANK.exams.map(exam => 
            `<option value="${exam.id}">${exam.name}</option>`
        ).join('');

        this.showModal(`
            <h3 class="text-lg font-bold mb-4">开始练习</h3>
            <div class="space-y-3">
                <div>
                    <label class="text-sm text-gray-600 mb-1 block">选择试卷</label>
                    <select id="practice-exam-select" class="w-full p-3 border border-gray-200 rounded-lg">
                        ${examOptions}
                    </select>
                </div>
                <div>
                    <label class="text-sm text-gray-600 mb-1 block">选择模式</label>
                    <div class="grid grid-cols-2 gap-3">
                        <button onclick="app.startQuizFromPicker('practice')" class="p-3 border-2 border-blue-500 text-blue-500 rounded-lg font-medium">做题模式</button>
                        <button onclick="app.startQuizFromPicker('exam')" class="p-3 border-2 border-orange-500 text-orange-500 rounded-lg font-medium">考试模式</button>
                    </div>
                </div>
            </div>
            <button onclick="app.closeModal()" class="w-full mt-4 py-3 text-gray-500">取消</button>
        `);
    }

    startQuizFromPicker(mode) {
        const examId = document.getElementById('practice-exam-select').value;
        this.closeModal();
        this.startQuiz(examId, mode);
    }

    // 开始答题
    startQuiz(examId, mode, customQuestions = null) {
        this.closeModal();
        const exam = QUESTION_BANK.getExamById(examId);
        const questions = customQuestions || exam.questions.map(q => ({...q}));

        this.quizState = {
            examId,
            examName: customQuestions ? '错题练习' : exam.name,
            mode, // 'practice' 做题模式, 'exam' 考试模式
            questions,
            currentIndex: 0,
            answers: {}, // {questionId: userAnswer}
            isSubmitted: {}, // {questionId: boolean}
            startTime: Date.now(),
            isWrongPractice: !!customQuestions
        };

        this.previousPage = 'quiz';
        this.showPage('quiz');

        // 更新标题
        document.getElementById('quiz-title').textContent = this.quizState.examName;
        document.getElementById('quiz-mode-text').textContent = mode === 'exam' ? '考试模式' : '做题模式';
        document.getElementById('total-num').textContent = questions.length;

        // 考试模式显示计时器
        if (mode === 'exam') {
            this.startTimer(exam.duration * 60);
            document.getElementById('timer-display').classList.remove('hidden');
            document.getElementById('btn-submit-exam').style.display = 'block';
        } else {
            document.getElementById('timer-display').classList.add('hidden');
            document.getElementById('btn-submit-exam').style.display = 'none';
        }

        this.renderQuestion();
    }

    // 开始计时器
    startTimer(seconds) {
        this.stopTimer();
        let remaining = seconds;
        const timerDisplay = document.getElementById('timer-display');

        this.timer = setInterval(() => {
            remaining--;
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

            if (remaining <= 300) { // 最后5分钟红色警告
                timerDisplay.style.color = '#fef2f2';
            }

            if (remaining <= 0) {
                this.stopTimer();
                this.showToast('考试时间到，自动交卷');
                this.submitExam();
            }
        }, 1000);
    }

    // 停止计时器
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    // 渲染当前题目
    renderQuestion() {
        const state = this.quizState;
        const q = state.questions[state.currentIndex];
        const userAnswer = state.answers[q.id] || '';
        const isSubmitted = state.isSubmitted[q.id];

        // 更新进度
        document.getElementById('current-num').textContent = state.currentIndex + 1;
        document.getElementById('progress-fill').style.width = `${(state.currentIndex + 1) / state.questions.length * 100}%`;

        // 更新按钮文字
        const btnNext = document.getElementById('btn-next');
        const btnPrev = document.getElementById('btn-prev');
        btnPrev.style.visibility = state.currentIndex > 0 ? 'visible' : 'hidden';

        if (state.mode === 'exam') {
            btnNext.textContent = state.currentIndex === state.questions.length - 1 ? '交卷' : '下一题';
        } else {
            if (!isSubmitted) {
                btnNext.textContent = '提交答案';
            } else {
                btnNext.textContent = state.currentIndex === state.questions.length - 1 ? '完成练习' : '下一题';
            }
        }

        // 生成题目HTML
        let html = `
            <div class="card p-4 mb-4">
                <div class="flex items-center mb-3">
                    <span class="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded mr-2">${q.typeName}</span>
                    <span class="text-sm text-gray-500">第${state.currentIndex + 1}题</span>
                </div>
                <div class="text-gray-800 text-base leading-relaxed whitespace-pre-wrap">${q.stem}</div>
            </div>
        `;

        // 选项区
        if (q.type === 'single' || q.type === 'judge') {
            html += `<div class="space-y-3 mb-4">`;
            q.options.forEach(opt => {
                let className = 'option-btn w-full p-4 border-2 border-gray-200 rounded-xl text-left flex items-start';
                if (isSubmitted || state.mode === 'exam') {
                    if (opt.key === q.answer) {
                        className += ' correct';
                    } else if (userAnswer.includes(opt.key) && opt.key !== q.answer) {
                        className += ' wrong';
                    }
                } else if (userAnswer === opt.key) {
                    className += ' selected';
                }
                const disabled = (isSubmitted && state.mode === 'practice') ? 'disabled' : '';
                html += `
                    <button class="${className}" ${disabled} onclick="app.selectOption('${opt.key}')">
                        <span class="w-7 h-7 rounded-full border-2 border-gray-300 flex items-center justify-center mr-3 flex-shrink-0 font-medium text-sm ${userAnswer === opt.key ? 'border-blue-500 bg-blue-500 text-white' : ''}">${opt.key}</span>
                        <span class="text-gray-700 pt-0.5">${opt.text}</span>
                    </button>
                `;
            });
            html += `</div>`;
        } else if (q.type === 'multiple') {
            html += `<div class="space-y-3 mb-4">`;
            const selectedAnswers = userAnswer.split('').sort().join('');
            q.options.forEach(opt => {
                let className = 'option-btn w-full p-4 border-2 border-gray-200 rounded-xl text-left flex items-start';
                if (isSubmitted || state.mode === 'exam') {
                    if (q.answer.includes(opt.key)) {
                        className += ' correct';
                    } else if (userAnswer.includes(opt.key) && !q.answer.includes(opt.key)) {
                        className += ' wrong';
                    }
                } else if (userAnswer.includes(opt.key)) {
                    className += ' selected';
                }
                const disabled = (isSubmitted && state.mode === 'practice') ? 'disabled' : '';
                html += `
                    <button class="${className}" ${disabled} onclick="app.toggleMultipleOption('${opt.key}')">
                        <span class="w-7 h-7 rounded border-2 border-gray-300 flex items-center justify-center mr-3 flex-shrink-0 text-sm ${userAnswer.includes(opt.key) ? 'border-blue-500 bg-blue-500 text-white' : ''}">
                            ${userAnswer.includes(opt.key) ? '✓' : ''}
                        </span>
                        <span class="text-gray-700 pt-0.5">${opt.text}</span>
                    </button>
                `;
            });
            html += `</div>`;
        } else {
            // 主观题
            html += `
                <div class="card p-4 mb-4">
                    <div class="text-sm text-gray-500 mb-2">请输入你的答案：</div>
                    <textarea class="subjective-answer" id="subjective-answer" placeholder="作答区域..." ${isSubmitted && state.mode === 'practice' ? 'disabled' : ''}>${userAnswer}</textarea>
                </div>
            `;
        }

        // 答案解析（做题模式提交后显示）
        if (isSubmitted && state.mode === 'practice') {
            const isCorrect = this.checkAnswer(q, userAnswer);
            html += `
                <div class="card p-4 mb-4 ${isCorrect ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}">
                    <div class="flex items-center mb-3">
                        <span class="text-lg mr-2">${isCorrect ? '✅' : '❌'}</span>
                        <span class="font-bold ${isCorrect ? 'text-green-600' : 'text-red-600'}">${isCorrect ? '回答正确' : '回答错误'}</span>
                    </div>
                    <div class="mb-3">
                        <span class="text-sm text-gray-500">正确答案：</span>
                        <span class="font-medium text-green-600">${q.answer}</span>
                    </div>
                    ${userAnswer ? `
                    <div class="mb-3">
                        <span class="text-sm text-gray-500">你的答案：</span>
                        <span class="${isCorrect ? 'text-green-600' : 'text-red-600'}">${userAnswer || '(未作答)'}</span>
                    </div>
                    ` : ''}
                    <div>
                        <span class="text-sm text-gray-500 block mb-2">📖 解析：</span>
                        <div class="text-gray-700 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">${q.analysis}</div>
                    </div>
                </div>
            `;
        }

        document.getElementById('quiz-content').innerHTML = html;
        this.renderAnswerCard();
    }

    // 单选
    selectOption(key) {
        const state = this.quizState;
        const q = state.questions[state.currentIndex];
        if (state.isSubmitted[q.id] && state.mode === 'practice') return;

        state.answers[q.id] = key;
        this.renderQuestion();
    }

    // 多选
    toggleMultipleOption(key) {
        const state = this.quizState;
        const q = state.questions[state.currentIndex];
        if (state.isSubmitted[q.id] && state.mode === 'practice') return;

        let current = state.answers[q.id] || '';
        if (current.includes(key)) {
            current = current.replace(key, '');
        } else {
            current = (current + key).split('').sort().join('');
        }
        state.answers[q.id] = current;
        this.renderQuestion();
    }

    // 检查答案是否正确
    checkAnswer(question, userAnswer) {
        if (question.type === 'short' || question.type === 'essay' || question.type === 'case') {
            // 主观题不自动判分，需要用户自己对照
            return userAnswer && userAnswer.trim().length > 0;
        }
        if (!userAnswer) return false;
        
        if (question.type === 'multiple') {
            return userAnswer.split('').sort().join('') === question.answer.split('').sort().join('');
        }
        return userAnswer === question.answer;
    }

    // 提交答案或下一题
    submitOrNext() {
        const state = this.quizState;
        const q = state.questions[state.currentIndex];

        // 获取主观题答案
        if (q.type === 'short' || q.type === 'essay' || q.type === 'case') {
            const textarea = document.getElementById('subjective-answer');
            if (textarea) {
                state.answers[q.id] = textarea.value;
            }
        }

        const userAnswer = state.answers[q.id] || '';

        if (state.mode === 'exam') {
            // 考试模式，直接下一题或交卷
            if (state.currentIndex === state.questions.length - 1) {
                this.submitExam();
            } else {
                state.currentIndex++;
                this.renderQuestion();
            }
        } else {
            // 做题模式
            if (!state.isSubmitted[q.id]) {
                // 提交答案
                if (!userAnswer) {
                    this.showToast('请先作答');
                    return;
                }
                state.isSubmitted[q.id] = true;
                this.recordAnswer(q, userAnswer);
                this.renderQuestion();
            } else {
                // 下一题或完成
                if (state.currentIndex === state.questions.length - 1) {
                    this.finishPractice();
                } else {
                    state.currentIndex++;
                    this.renderQuestion();
                }
            }
        }
    }

    // 记录答题结果
    recordAnswer(question, userAnswer) {
        const answers = this.getStorage('answers') || {};
        const wrongBook = this.getStorage('wrongBook') || [];
        const stats = this.getStorage('stats') || { totalAnswered: 0, correctCount: 0, practiceDays: [], examCount: 0 };

        const isCorrect = this.checkAnswer(question, userAnswer);
        const today = new Date().toDateString();

        // 更新答题记录
        answers[question.id] = {
            userAnswer,
            isCorrect,
            timestamp: Date.now()
        };

        // 更新统计
        if (!answers[question.id].counted) {
            stats.totalAnswered++;
            if (isCorrect) stats.correctCount++;
            answers[question.id].counted = true;
        }

        // 更新练习天数
        if (!stats.practiceDays.includes(today)) {
            stats.practiceDays.push(today);
        }

        // 更新错题本
        if (!isCorrect) {
            if (!wrongBook.includes(question.id)) {
                wrongBook.push(question.id);
            }
        } else {
            // 如果答对了，从错题本移除
            const idx = wrongBook.indexOf(question.id);
            if (idx > -1) wrongBook.splice(idx, 1);
        }

        this.setStorage('answers', answers);
        this.setStorage('wrongBook', wrongBook);
        this.setStorage('stats', stats);
    }

    // 上一题
    prevQuestion() {
        if (this.quizState.currentIndex > 0) {
            // 先保存主观题答案
            const q = this.quizState.questions[this.quizState.currentIndex];
            if (q.type === 'short' || q.type === 'essay' || q.type === 'case') {
                const textarea = document.getElementById('subjective-answer');
                if (textarea) {
                    this.quizState.answers[q.id] = textarea.value;
                }
            }
            this.quizState.currentIndex--;
            this.renderQuestion();
        }
    }

    // 渲染答题卡
    renderAnswerCard() {
        const state = this.quizState;
        const grid = document.getElementById('answer-card-grid');
        
        grid.innerHTML = state.questions.map((q, idx) => {
            const answered = state.answers[q.id] && state.answers[q.id].length > 0;
            const isCurrent = idx === state.currentIndex;
            const isSubmitted = state.isSubmitted[q.id];
            let className = 'question-num';
            
            if (state.mode === 'practice' && isSubmitted) {
                className += this.checkAnswer(q, state.answers[q.id]) ? ' answered' : ' wrong';
            } else if (isCurrent) {
                className += ' current';
            } else if (answered) {
                className += ' answered';
            } else {
                className += ' unanswered';
            }
            
            return `<div class="${className}" onclick="app.jumpToQuestion(${idx})">${idx + 1}</div>`;
        }).join('');
    }

    // 跳转到指定题目
    jumpToQuestion(idx) {
        // 保存当前主观题答案
        const q = this.quizState.questions[this.quizState.currentIndex];
        if (q.type === 'short' || q.type === 'essay' || q.type === 'case') {
            const textarea = document.getElementById('subjective-answer');
            if (textarea) {
                this.quizState.answers[q.id] = textarea.value;
            }
        }
        this.quizState.currentIndex = idx;
        this.closeAnswerCard();
        this.renderQuestion();
    }

    // 打开答题卡
    openAnswerCard() {
        document.getElementById('answer-card').classList.add('open');
        document.getElementById('answer-card-overlay').classList.add('open');
    }

    // 关闭答题卡
    closeAnswerCard() {
        document.getElementById('answer-card').classList.remove('open');
        document.getElementById('answer-card-overlay').classList.remove('open');
    }

    // 确认退出
    confirmExit() {
        this.showModal(`
            <h3 class="text-lg font-bold mb-4">确认退出？</h3>
            <p class="text-gray-600 mb-6">退出后当前答题进度将不会保存（已提交的题目会记录）。</p>
            <div class="flex gap-3">
                <button onclick="app.closeModal()" class="btn-secondary flex-1">继续答题</button>
                <button onclick="app.exitQuiz()" class="btn-primary flex-1 bg-red-500">确认退出</button>
            </div>
        `);
    }

    // 退出答题
    exitQuiz() {
        this.stopTimer();
        this.closeModal();
        this.quizState = null;
        this.goHome();
    }

    // 交卷（考试模式）
    submitExam() {
        const state = this.quizState;
        this.stopTimer();

        // 计算成绩
        let correct = 0, wrong = 0, unanswered = 0;
        let objectiveCorrect = 0, objectiveTotal = 0;

        state.questions.forEach(q => {
            const userAnswer = state.answers[q.id] || '';
            const isObjective = ['single', 'multiple', 'judge'].includes(q.type);
            
            if (isObjective) objectiveTotal++;
            
            if (!userAnswer) {
                unanswered++;
            } else {
                const isCorrect = this.checkAnswer(q, userAnswer);
                if (isObjective) {
                    if (isCorrect) objectiveCorrect++;
                    else wrong++;
                }
                // 记录答题
                this.recordAnswer(q, userAnswer);
            }
        });

        const timeUsed = Math.floor((Date.now() - state.startTime) / 1000);
        const score = objectiveTotal > 0 ? Math.round(objectiveCorrect / objectiveTotal * 100) : 0;

        // 保存历史记录
        const history = this.getStorage('history') || [];
        const record = {
            id: Date.now().toString(),
            examId: state.examId,
            examName: state.examName,
            mode: 'exam',
            score,
            total: state.questions.length,
            correct: objectiveCorrect,
            wrong: objectiveTotal - objectiveCorrect,
            unanswered,
            time: timeUsed,
            timestamp: Date.now(),
            answers: {...state.answers}
        };
        history.unshift(record);

        // 更新统计
        const stats = this.getStorage('stats') || { totalAnswered: 0, correctCount: 0, practiceDays: [], examCount: 0 };
        stats.examCount++;
        const today = new Date().toDateString();
        if (!stats.practiceDays.includes(today)) {
            stats.practiceDays.push(today);
        }

        this.setStorage('history', history);
        this.setStorage('stats', stats);

        this.showResult(record, state.questions);
    }

    // 完成练习（做题模式）
    finishPractice() {
        const state = this.quizState;
        this.stopTimer();

        let correct = 0, wrong = 0;
        state.questions.forEach(q => {
            const userAnswer = state.answers[q.id] || '';
            if (userAnswer) {
                if (this.checkAnswer(q, userAnswer)) correct++;
                else wrong++;
            }
        });

        const timeUsed = Math.floor((Date.now() - state.startTime) / 1000);
        const total = state.questions.length;
        const score = total > 0 ? Math.round(correct / total * 100) : 0;

        // 保存历史记录
        const history = this.getStorage('history') || [];
        const record = {
            id: Date.now().toString(),
            examId: state.examId,
            examName: state.examName,
            mode: 'practice',
            score,
            total,
            correct,
            wrong,
            unanswered: total - correct - wrong,
            time: timeUsed,
            timestamp: Date.now(),
            answers: {...state.answers},
            isWrongPractice: state.isWrongPractice
        };
        history.unshift(record);
        this.setStorage('history', history);

        this.showResult(record, state.questions);
    }

    // 显示结果页
    showResult(record, questions) {
        this.quizState = null;
        this.showPage('result');

        document.getElementById('result-score').textContent = record.score;
        document.getElementById('result-title').textContent = record.examName;
        document.getElementById('result-correct').textContent = record.correct;
        document.getElementById('result-wrong').textContent = record.wrong + (record.unanswered || 0);
        
        const mins = Math.floor(record.time / 60);
        const secs = record.time % 60;
        document.getElementById('result-time').textContent = `${mins}分${secs}秒`;
        
        const rate = record.total > 0 ? Math.round(record.correct / record.total * 100) : 0;
        document.getElementById('result-rate').textContent = `正确率 ${rate}%`;

        // 错题列表
        const wrongList = document.getElementById('wrong-list');
        const wrongQuestions = questions.filter(q => {
            const userAnswer = record.answers[q.id] || '';
            return userAnswer && !this.checkAnswer(q, userAnswer);
        });

        const btnRetry = document.getElementById('btn-retry-wrong');
        if (wrongQuestions.length === 0 || record.isWrongPractice) {
            btnRetry.style.display = 'none';
            wrongList.innerHTML = `
                <div class="card p-8 text-center">
                    <div class="text-4xl mb-3">🎉</div>
                    <div class="text-gray-600">${wrongQuestions.length === 0 ? '太棒了！全部答对！' : '练习完成'}</div>
                </div>
            `;
        } else {
            btnRetry.style.display = 'block';
            wrongList.innerHTML = wrongQuestions.map((q, idx) => `
                <div class="card p-4 mb-3" onclick="app.viewQuestionDetail('${q.id}', '${record.id}')">
                    <div class="flex items-start">
                        <span class="px-2 py-1 bg-red-100 text-red-600 text-xs rounded mr-2 flex-shrink-0">${q.typeName}</span>
                        <div class="flex-1">
                            <div class="text-gray-800 text-sm line-clamp-2">${idx + 1}. ${q.stem}</div>
                            <div class="mt-2 text-xs">
                                <span class="text-red-500">你的答案：${record.answers[q.id] || '未作答'}</span>
                                <span class="text-green-600 ml-2">正确答案：${q.answer}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    // 查看题目详情
    viewQuestionDetail(questionId, recordId) {
        const q = QUESTION_BANK.getQuestionById(questionId);
        const history = this.getStorage('history') || [];
        const record = history.find(r => r.id === recordId);
        const userAnswer = record ? record.answers[questionId] : '';

        this.showModal(`
            <h3 class="text-lg font-bold mb-3">题目详情</h3>
            <div class="text-sm text-gray-500 mb-2">${q.typeName} · ${q.year}年</div>
            <div class="text-gray-800 mb-4 whitespace-pre-wrap">${q.stem}</div>
            ${q.options ? `
                <div class="space-y-2 mb-4">
                    ${q.options.map(opt => `
                        <div class="p-2 rounded ${opt.key === q.answer ? 'bg-green-50 text-green-700' : (userAnswer === opt.key ? 'bg-red-50 text-red-700' : 'bg-gray-50')}">
                            <span class="font-medium">${opt.key}.</span> ${opt.text}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            <div class="text-sm mb-2">
                <span class="text-gray-500">正确答案：</span>
                <span class="text-green-600 font-medium">${q.answer}</span>
            </div>
            <div class="text-sm mb-3">
                <span class="text-gray-500">你的答案：</span>
                <span class="${userAnswer === q.answer ? 'text-green-600' : 'text-red-600'}">${userAnswer || '未作答'}</span>
            </div>
            <div class="bg-blue-50 p-3 rounded-lg">
                <div class="text-sm text-blue-600 font-medium mb-1">📖 解析</div>
                <div class="text-sm text-gray-700 whitespace-pre-wrap">${q.analysis}</div>
            </div>
            <button onclick="app.closeModal()" class="w-full mt-4 btn-primary">关闭</button>
        `);
    }

    // 重做错题
    retryWrong() {
        const history = this.getStorage('history') || [];
        const lastRecord = history[0];
        if (!lastRecord) return;

        const exam = QUESTION_BANK.getExamById(lastRecord.examId);
        const wrongQuestions = exam.questions.filter(q => {
            const userAnswer = lastRecord.answers[q.id] || '';
            return userAnswer && !this.checkAnswer(q, userAnswer);
        });

        if (wrongQuestions.length === 0) {
            this.showToast('没有需要重做的错题');
            return;
        }

        this.startQuiz(lastRecord.examId, 'practice', wrongQuestions);
    }

    // 前往错题本
    goToWrongBook() {
        this.previousPage = this.currentPage;
        this.showPage('wrong');
        this.renderWrongBook();
    }

    // 渲染错题本
    renderWrongBook() {
        const wrongBook = this.getStorage('wrongBook') || [];
        const allQuestions = QUESTION_BANK.getAllQuestions();
        const wrongQuestions = allQuestions.filter(q => wrongBook.includes(q.id));

        // 筛选
        const years = [...new Set(wrongQuestions.map(q => q.year))].sort((a, b) => b - a);
        const types = [...new Set(wrongQuestions.map(q => q.typeName))];

        document.getElementById('year-filters').innerHTML = `
            <span class="filter-chip ${this.filters.year === 'all' ? 'active' : ''}" onclick="app.setFilter('year', 'all')">全部</span>
            ${years.map(y => `<span class="filter-chip ${this.filters.year === y ? 'active' : ''}" onclick="app.setFilter('year', ${y})">${y}年</span>`).join('')}
        `;

        document.getElementById('type-filters').innerHTML = `
            <span class="filter-chip ${this.filters.type === 'all' ? 'active' : ''}" onclick="app.setFilter('type', 'all')">全部</span>
            ${types.map(t => `<span class="filter-chip ${this.filters.type === t ? 'active' : ''}" onclick="app.setFilter('type', '${t}')">${t}</span>`).join('')}
        `;

        // 筛选后的题目
        let filtered = wrongQuestions;
        if (this.filters.year !== 'all') {
            filtered = filtered.filter(q => q.year === this.filters.year);
        }
        if (this.filters.type !== 'all') {
            filtered = filtered.filter(q => q.typeName === this.filters.type);
        }

        const list = document.getElementById('wrong-book-list');
        if (filtered.length === 0) {
            list.innerHTML = `
                <div class="card p-8 text-center">
                    <div class="text-4xl mb-3">📚</div>
                    <div class="text-gray-600">${wrongQuestions.length === 0 ? '暂无错题，继续加油！' : '该筛选条件下暂无错题'}</div>
                </div>
            `;
        } else {
            list.innerHTML = filtered.map((q, idx) => `
                <div class="card p-4 mb-3">
                    <div class="flex items-start justify-between">
                        <div class="flex-1 pr-3">
                            <div class="flex items-center mb-2">
                                <span class="px-2 py-1 bg-red-100 text-red-600 text-xs rounded mr-2">${q.typeName}</span>
                                <span class="text-xs text-gray-500">${q.year}年</span>
                            </div>
                            <div class="text-gray-800 text-sm line-clamp-2 mb-2">${q.stem}</div>
                            <div class="text-xs text-green-600">正确答案：${q.answer}</div>
                        </div>
                        <button onclick="app.removeFromWrongBook('${q.id}')" class="text-gray-400 p-2 flex-shrink-0">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    // 设置筛选
    setFilter(type, value) {
        this.filters[type] = value;
        this.renderWrongBook();
    }

    // 从错题本移除
    removeFromWrongBook(questionId) {
        this.showModal(`
            <h3 class="text-lg font-bold mb-4">移除错题？</h3>
            <p class="text-gray-600 mb-6">确定已掌握这道题，将其从错题本移除吗？</p>
            <div class="flex gap-3">
                <button onclick="app.closeModal()" class="btn-secondary flex-1">取消</button>
                <button onclick="app.confirmRemove('${questionId}')" class="btn-primary flex-1 bg-red-500">确认移除</button>
            </div>
        `);
    }

    confirmRemove(questionId) {
        const wrongBook = this.getStorage('wrongBook') || [];
        const idx = wrongBook.indexOf(questionId);
        if (idx > -1) wrongBook.splice(idx, 1);
        this.setStorage('wrongBook', wrongBook);
        this.closeModal();
        this.renderWrongBook();
        this.updateStats();
        this.showToast('已移除');
    }

    // 开始错题练习
    startWrongPractice() {
        const wrongBook = this.getStorage('wrongBook') || [];
        let questions = QUESTION_BANK.getAllQuestions().filter(q => wrongBook.includes(q.id));
        
        if (this.filters.year !== 'all') {
            questions = questions.filter(q => q.year === this.filters.year);
        }
        if (this.filters.type !== 'all') {
            questions = questions.filter(q => q.typeName === this.filters.type);
        }

        if (questions.length === 0) {
            this.showToast('没有可练习的错题');
            return;
        }

        // 随机打乱顺序
        questions = questions.sort(() => Math.random() - 0.5);
        this.startQuiz('wrong', 'practice', questions);
    }

    // 导出错题
    exportWrongQuestions() {
        const wrongBook = this.getStorage('wrongBook') || [];
        const wrongQuestions = QUESTION_BANK.getAllQuestions().filter(q => wrongBook.includes(q.id));

        if (wrongQuestions.length === 0) {
            this.showToast('暂无错题可导出');
            return;
        }

        this.showModal(`
            <h3 class="text-lg font-bold mb-4">导出错题</h3>
            <p class="text-gray-600 mb-4">将导出${wrongQuestions.length}道错题</p>
            <div class="space-y-3">
                <button onclick="app.exportWrongAsTxt()" class="w-full btn-primary">导出为TXT文本</button>
                <button onclick="app.exportWrongAsJson()" class="w-full btn-secondary">导出为JSON数据</button>
            </div>
            <button onclick="app.closeModal()" class="w-full mt-3 py-3 text-gray-500">取消</button>
        `);
    }

    // 导出TXT
    exportWrongAsTxt() {
        const wrongBook = this.getStorage('wrongBook') || [];
        const wrongQuestions = QUESTION_BANK.getAllQuestions().filter(q => wrongBook.includes(q.id));
        
        let content = `茂名教师招聘考试 - 错题本导出\n`;
        content += `导出时间：${new Date().toLocaleString()}\n`;
        content += `错题数量：${wrongQuestions.length}道\n`;
        content += `${'='.repeat(50)}\n\n`;

        wrongQuestions.forEach((q, idx) => {
            content += `【${idx + 1}】${q.typeName} · ${q.year}年\n`;
            content += `${q.stem}\n`;
            if (q.options) {
                q.options.forEach(opt => {
                    content += `${opt.key}. ${opt.text}\n`;
                });
            }
            content += `\n正确答案：${q.answer}\n`;
            content += `解析：${q.analysis}\n`;
            content += `${'-'.repeat(50)}\n\n`;
        });

        this.downloadFile(content, `错题本_${new Date().toLocaleDateString().replace(/\//g, '-')}.txt`, 'text/plain');
        this.closeModal();
        this.showToast('导出成功');
    }

    // 导出JSON
    exportWrongAsJson() {
        const wrongBook = this.getStorage('wrongBook') || [];
        const wrongQuestions = QUESTION_BANK.getAllQuestions().filter(q => wrongBook.includes(q.id));
        
        const data = {
            exportTime: new Date().toISOString(),
            count: wrongQuestions.length,
            questions: wrongQuestions
        };

        this.downloadFile(JSON.stringify(data, null, 2), `错题本_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`, 'application/json');
        this.closeModal();
        this.showToast('导出成功');
    }

    // 下载文件
    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type: type + ';charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 前往历史记录
    goToHistory() {
        this.previousPage = this.currentPage;
        this.showPage('history');
        this.renderHistory();
    }

    // 渲染历史记录
    renderHistory() {
        const history = this.getStorage('history') || [];
        const list = document.getElementById('history-list');

        if (history.length === 0) {
            list.innerHTML = `
                <div class="card p-8 text-center">
                    <div class="text-4xl mb-3">📝</div>
                    <div class="text-gray-600">暂无答题记录</div>
                </div>
            `;
            return;
        }

        list.innerHTML = history.map(record => {
            const date = new Date(record.timestamp);
            const dateStr = `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            const mins = Math.floor(record.time / 60);
            const modeText = record.mode === 'exam' ? '考试' : '练习';
            const modeColor = record.mode === 'exam' ? 'text-orange-600 bg-orange-50' : 'text-blue-600 bg-blue-50';

            return `
                <div class="card p-4 mb-3 cursor-pointer" onclick="app.viewHistoryDetail('${record.id}')">
                    <div class="flex items-center justify-between mb-2">
                        <span class="px-2 py-1 ${modeColor} text-xs rounded">${modeText}</span>
                        <span class="text-xs text-gray-400">${dateStr}</span>
                    </div>
                    <div class="font-medium text-gray-800 mb-2">${record.examName}</div>
                    <div class="flex items-center justify-between">
                        <div class="flex gap-4 text-sm">
                            <span class="text-gray-600">得分 <span class="font-bold text-blue-600">${record.score}</span></span>
                            <span class="text-gray-600">正确 <span class="text-green-600">${record.correct}</span></span>
                            <span class="text-gray-600">用时 ${mins}分钟</span>
                        </div>
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 查看历史详情
    viewHistoryDetail(recordId) {
        const history = this.getStorage('history') || [];
        const record = history.find(r => r.id === recordId);
        if (!record) return;

        const exam = QUESTION_BANK.getExamById(record.examId);
        const questions = exam ? exam.questions : QUESTION_BANK.getAllQuestions();

        let questionsHtml = '';
        questions.forEach((q, idx) => {
            const userAnswer = record.answers[q.id] || '';
            if (!userAnswer && record.mode === 'exam') return; // 考试模式未作答的不显示
            if (!userAnswer) return;
            const isCorrect = this.checkAnswer(q, userAnswer);

            questionsHtml += `
                <div class="p-3 border-b border-gray-100">
                    <div class="flex items-start">
                        <span class="mr-2">${isCorrect ? '✅' : '❌'}</span>
                        <div class="flex-1">
                            <div class="text-sm text-gray-800 mb-1">${idx + 1}. ${q.stem.substring(0, 50)}${q.stem.length > 50 ? '...' : ''}</div>
                            <div class="text-xs">
                                <span class="${isCorrect ? 'text-green-600' : 'text-red-600'}">你的答案：${userAnswer}</span>
                                ${!isCorrect ? `<span class="text-green-600 ml-2">正确：${q.answer}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        this.showModal(`
            <h3 class="text-lg font-bold mb-2">${record.examName}</h3>
            <div class="text-sm text-gray-500 mb-4">${record.mode === 'exam' ? '考试模式' : '练习模式'} · 得分${record.score}分 · 正确${record.correct}题</div>
            <div class="max-h-80 overflow-y-auto border border-gray-100 rounded-lg">
                ${questionsHtml || '<div class="p-4 text-center text-gray-500">无答题记录</div>'}
            </div>
            <button onclick="app.deleteHistory('${record.id}')" class="w-full mt-4 py-2 text-red-500 text-sm">删除此记录</button>
            <button onclick="app.closeModal()" class="w-full mt-2 btn-primary">关闭</button>
        `);
    }

    // 删除历史记录
    deleteHistory(recordId) {
        let history = this.getStorage('history') || [];
        history = history.filter(r => r.id !== recordId);
        this.setStorage('history', history);
        this.closeModal();
        this.renderHistory();
        this.showToast('已删除');
    }

    // 前往个人页
    goToProfile() {
        this.previousPage = this.currentPage;
        this.showPage('profile');
        this.updateStats();
    }

    // 数据管理
    showDataManage() {
        this.showModal(`
            <h3 class="text-lg font-bold mb-4">数据管理</h3>
            <div class="space-y-3">
                <button onclick="app.exportAllData()" class="w-full p-4 bg-blue-50 rounded-xl text-left">
                    <div class="font-medium text-gray-800">📤 导出所有数据</div>
                    <div class="text-sm text-gray-500">导出做题记录、错题本、历史记录</div>
                </button>
                <button onclick="app.confirmClearData()" class="w-full p-4 bg-red-50 rounded-xl text-left">
                    <div class="font-medium text-red-600">🗑️ 清空所有数据</div>
                    <div class="text-sm text-gray-500">清除所有做题记录（不可恢复）</div>
                </button>
            </div>
            <button onclick="app.closeModal()" class="w-full mt-4 py-3 text-gray-500">取消</button>
        `);
    }

    // 导出所有数据
    exportAllData() {
        const data = {
            exportTime: new Date().toISOString(),
            answers: this.getStorage('answers'),
            wrongBook: this.getStorage('wrongBook'),
            history: this.getStorage('history'),
            stats: this.getStorage('stats')
        };

        this.downloadFile(JSON.stringify(data, null, 2), `刷题数据备份_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`, 'application/json');
        this.closeModal();
        this.showToast('导出成功');
    }

    // 确认清空数据
    confirmClearData() {
        this.showModal(`
            <h3 class="text-lg font-bold mb-4 text-red-600">⚠️ 确认清空</h3>
            <p class="text-gray-600 mb-6">此操作将清除所有做题记录、错题本、历史记录等数据，且不可恢复！</p>
            <div class="flex gap-3">
                <button onclick="app.closeModal()" class="btn-secondary flex-1">取消</button>
                <button onclick="app.clearAllData()" class="btn-primary flex-1 bg-red-500">确认清空</button>
            </div>
        `);
    }

    // 清空所有数据
    clearAllData() {
        localStorage.removeItem('quiz_answers');
        localStorage.removeItem('quiz_wrongBook');
        localStorage.removeItem('quiz_history');
        localStorage.removeItem('quiz_stats');
        this.initStorage();
        this.closeModal();
        this.updateStats();
        this.showToast('数据已清空');
    }

    // 关于
    showAbout() {
        this.showModal(`
            <h3 class="text-lg font-bold mb-4">关于本应用</h3>
            <div class="text-gray-600 space-y-3">
                <p>📚 茂名市教师招聘考试真题刷题应用</p>
                <p>✨ 功能特点：</p>
                <ul class="list-disc list-inside text-sm space-y-1 ml-2">
                    <li>做题模式/考试模式双模式</li>
                    <li>自动错题本</li>
                    <li>答题记录本地保存</li>
                    <li>支持导出错题</li>
                </ul>
                <p class="text-sm text-gray-400 mt-4">数据保存在浏览器本地，清理浏览器数据会丢失记录，请及时导出备份。</p>
            </div>
            <button onclick="app.closeModal()" class="w-full mt-6 btn-primary">知道了</button>
        `);
    }
}

// 初始化应用
const app = new QuizApp();
