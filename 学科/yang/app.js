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
        
        // Progress tracking
        const progress = ref({
            totalAnswered: 0,
            correctAnswers: 0,
            streak: 0,
            bestStreak: 0,
            completedModules: []
        });
        
        const achievements = ref([
            { id: 'first_blood', name: '初露锋芒', desc: '完成第一道题目', icon: '🌟', unlocked: false },
            { id: 'streak_5', name: '连对五题', desc: '连续答对5道题', icon: '🔥', unlocked: false },
            { id: 'streak_10', name: '十连胜', desc: '连续答对10道题', icon: '💯', unlocked: false },
            { id: 'streak_20', name: '无敌连胜', desc: '连续答对20道题', icon: '👑', unlocked: false },
            { id: 'perfect_module', name: '完美通关', desc: '完成一个模块的所有题目', icon: '🎯', unlocked: false },
            { id: 'half_done', name: '半途而废？', desc: '完成一半的题目', icon: '📚', unlocked: false },
            { id: 'all_done', name: '学霸诞生', desc: '完成所有题目', icon: '🏆', unlocked: false },
            { id: 'wrong_master', name: '知错能改', desc: '错题本清零', icon: '✅', unlocked: false }
        ]);
        
        const encouragementMessages = [
            "太棒了！继续保持！",
            "你真的很厉害！",
            "又对了！继续！",
            "完美！保持专注！",
            "学霸模式开启！",
            "杨如萍为你点赞！",
            "这都难不倒你！",
            "满分选手！"
        ];
        
        const updateProgress = (isCorrect, moduleId) => {
            progress.value.totalAnswered++;
            if (isCorrect) {
                progress.value.correctAnswers++;
                progress.value.streak++;
                if (progress.value.streak > progress.value.bestStreak) {
                    progress.value.bestStreak = progress.value.streak;
                }
                checkAchievements();
                if (progress.value.streak > 0 && progress.value.streak % 5 === 0) {
                    showEncouragement();
                }
            } else {
                progress.value.streak = 0;
            }
        };
        
        const checkAchievements = () => {
            const totalQuestions = modules.value.reduce((sum, mod) => sum + (mod.exercises?.length || 0), 0);
            
            if (progress.value.totalAnswered === 1) {
                unlockAchievement('first_blood');
            }
            if (progress.value.streak >= 5 && !achievements.value.find(a => a.id === 'streak_5')?.unlocked) {
                unlockAchievement('streak_5');
            }
            if (progress.value.streak >= 10 && !achievements.value.find(a => a.id === 'streak_10')?.unlocked) {
                unlockAchievement('streak_10');
            }
            if (progress.value.streak >= 20 && !achievements.value.find(a => a.id === 'streak_20')?.unlocked) {
                unlockAchievement('streak_20');
            }
            if (progress.value.totalAnswered >= totalQuestions / 2 && !achievements.value.find(a => a.id === 'half_done')?.unlocked) {
                unlockAchievement('half_done');
            }
            if (progress.value.totalAnswered >= totalQuestions && !achievements.value.find(a => a.id === 'all_done')?.unlocked) {
                unlockAchievement('all_done');
            }
            if (wrongQuestions.value.length === 0 && progress.value.totalAnswered > 0 && !achievements.value.find(a => a.id === 'wrong_master')?.unlocked) {
                unlockAchievement('wrong_master');
            }
        };
        
        const unlockAchievement = (achievementId) => {
            const achievement = achievements.value.find(a => a.id === achievementId);
            if (achievement && !achievement.unlocked) {
                achievement.unlocked = true;
                showAchievementNotification(achievement);
            }
        };
        
        const showAchievementNotification = (achievement) => {
            showYangBubble.value = true;
            yangMessage.value = `🎉 恭喜获得成就：${achievement.icon} ${achievement.name}！`;
            yangEmoji.value = achievement.icon;
            setTimeout(() => {
                showYangBubble.value = false;
            }, 3000);
        };
        
        const showEncouragement = () => {
            showYangBubble.value = true;
            yangMessage.value = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
            yangEmoji.value = '🎉';
            setTimeout(() => {
                showYangBubble.value = false;
            }, 2000);
        };
        
        const getAccuracy = () => {
            if (progress.value.totalAnswered === 0) return 0;
            return Math.round((progress.value.correctAnswers / progress.value.totalAnswered) * 100);
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
            const isCorrect = userAnswers.value[q.id] === q.answer;
            updateProgress(isCorrect, currentTab.value);
            
            // Check if wrong, add to wrong book
            if (!isCorrect) {
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
            getYangFeedbackFromWrongBook,
            
            // Progress & Achievements
            progress,
            achievements,
            getAccuracy
        };
    }
});

app.mount('#app');