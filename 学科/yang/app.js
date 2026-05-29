const { createApp, ref, computed, watch, onMounted } = Vue;

const app = createApp({
    setup() {
        const modules = ref(modulesData);
        const currentTab = ref(0); // 0-4 for modules, 'wrong-book' for wrong book
        const currentView = ref('knowledge'); // 'knowledge' or 'exercise'
        
        // Answers state
        const userAnswers = ref({});
        const submittedQuestions = ref({});
        
        // Wrong book state
        const wrongQuestions = ref([]);
        const wrongBookFilter = ref('all');
        const wrongBookAnswers = ref({});
        const wrongBookSubmitted = ref({});
        
        // Random feedback messages for wrong answers
        const yangFeedbackMessages = [
            "杨如萍同学，这道题的陷阱你是不是又踩进去了？",
            "杨如萍，题目都看了三遍了吗？再仔细看看？",
            "这一题杨如萍来了都得再读一遍题干。",
            "杨如萍探头：这题我上周错过，你居然也错？",
            "杨如萍叹气：审题啊审题，我当年就栽在这。",
            "杨如萍发来一条提醒：关键字在第三行，再找找？",
            "杨如萍警告：再错这题，今晚加练十道。",
            "杨如萍震怒：这都能错？回去重读题目！",
            "杨如萍的凝视.jpg —— 你真的看懂题目了吗？"
        ];
        
        const getRandomFeedback = () => {
            const randomIndex = Math.floor(Math.random() * yangFeedbackMessages.length);
            return yangFeedbackMessages[randomIndex];
        };
        
        // Initialize from localStorage
        onMounted(() => {
            const saved = localStorage.getItem('c_learning_wrong_book');
            if (saved) {
                try {
                    wrongQuestions.value = JSON.parse(saved);
                } catch (e) {
                    console.error("Failed to parse wrong book data");
                }
            }
        });
        
        // Save to localStorage when changed
        watch(wrongQuestions, (newVal) => {
            localStorage.setItem('c_learning_wrong_book', JSON.stringify(newVal));
        }, { deep: true });

        // Computed properties
        const currentModuleExercises = computed(() => {
            if (currentTab.value === 'wrong-book') return [];
            return modules.value[currentTab.value].exercises || [];
        });

        const parsedContent = computed(() => {
            if (currentTab.value === 'wrong-book') return '';
            const content = modules.value[currentTab.value].content;
            return marked.parse(content);
        });

        const filteredWrongQuestions = computed(() => {
            if (wrongBookFilter.value === 'all') return wrongQuestions.value;
            return wrongQuestions.value.filter(q => q.moduleId === wrongBookFilter.value);
        });

        // Methods
        const switchTab = (tab) => {
            currentTab.value = tab;
            if (tab !== 'wrong-book') {
                currentView.value = 'knowledge';
            }
            window.scrollTo(0, 0);
        };

        const highlightCode = (code) => {
            return hljs.highlight(code, { language: 'c' }).value;
        };

        const formatExplanation = (text) => {
            return marked.parseInline(text);
        };

        // Exercise logic
        const hasAnswered = (qId) => {
            return userAnswers.value[qId] !== undefined && userAnswers.value[qId] !== null;
        };

        const isSubmitted = (qId) => {
            return !!submittedQuestions.value[qId];
        };

        const isSelected = (qId, optIndex) => {
            return userAnswers.value[qId] === optIndex;
        };

        const isCorrectOption = (q, optIndex) => {
            return q.answer === optIndex;
        };

        const isAnswerCorrect = (qId) => {
            let question = null;
            for (let mod of modules.value) {
                const found = mod.exercises.find(e => e.id === qId);
                if (found) {
                    question = found;
                    break;
                }
            }
            if (!question) return false;
            return userAnswers.value[qId] === question.answer;
        };

        const submitAnswer = (q) => {
            submittedQuestions.value[q.id] = true;
            
            // Check if wrong, add to wrong book
            if (userAnswers.value[q.id] !== q.answer) {
                addToWrongBook(q, currentTab.value);
            }
        };

        // Wrong book logic
        const addToWrongBook = (q, moduleId) => {
            const exists = wrongQuestions.value.find(wq => wq.id === q.id);
            if (!exists) {
                wrongQuestions.value.unshift({
                    ...q,
                    moduleId: moduleId,
                    addedAt: new Date().getTime(),
                    yangFeedback: getRandomFeedback()
                });
            } else {
                // Update the existing wrong question's feedback
                exists.yangFeedback = getRandomFeedback();
            }
        };

        const getModuleShortTitle = (moduleId) => {
            return modules.value[moduleId]?.shortTitle || '未知';
        };

        const hasWrongBookAnswered = (qId) => {
            return wrongBookAnswers.value[qId] !== undefined && wrongBookAnswers.value[qId] !== null;
        };

        const isWrongBookSubmitted = (qId) => {
            return !!wrongBookSubmitted.value[qId];
        };

        const isWrongBookSelected = (qId, optIndex) => {
            return wrongBookAnswers.value[qId] === optIndex;
        };

        const isWrongBookAnswerCorrect = (qId) => {
            const question = wrongQuestions.value.find(q => q.id === qId);
            if (!question) return false;
            return wrongBookAnswers.value[qId] === question.answer;
        };

        const submitWrongBookAnswer = (q) => {
            wrongBookSubmitted.value[q.id] = true;
        };

        const retryWrongQuestion = (qId) => {
            wrongBookAnswers.value[qId] = null;
            wrongBookSubmitted.value[qId] = false;
        };

        const removeWrongQuestion = (qId) => {
            wrongQuestions.value = wrongQuestions.value.filter(q => q.id !== qId);
            // clean up state
            delete wrongBookAnswers.value[qId];
            delete wrongBookSubmitted.value[qId];
        };
        
        // Get yang feedback for a question
        const getYangFeedback = (qId) => {
            const question = wrongQuestions.value.find(q => q.id === qId);
            return question ? question.yangFeedback : '';
        };
        
        // Get yang feedback from wrong book
        const getYangFeedbackFromWrongBook = (qId) => {
            return getYangFeedback(qId);
        };

        return {
            modules,
            currentTab,
            currentView,
            switchTab,
            parsedContent,
            currentModuleExercises,
            
            // Exercise
            userAnswers,
            hasAnswered,
            isSubmitted,
            isSelected,
            isCorrectOption,
            isAnswerCorrect,
            submitAnswer,
            
            // Code & Markdown
            highlightCode,
            formatExplanation,
            
            // Wrong book
            wrongQuestions,
            wrongBookFilter,
            filteredWrongQuestions,
            getModuleShortTitle,
            wrongBookAnswers,
            hasWrongBookAnswered,
            isWrongBookSubmitted,
            isWrongBookSelected,
            isWrongBookAnswerCorrect,
            submitWrongBookAnswer,
            retryWrongQuestion,
            removeWrongQuestion,
            getYangFeedback,
            getYangFeedbackFromWrongBook
        };
    }
});

app.mount('#app');