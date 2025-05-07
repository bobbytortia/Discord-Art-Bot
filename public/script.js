import { gsap } from 'https://cdn.skypack.dev/gsap@3.7.0';
import Draggable from 'https://cdn.skypack.dev/gsap@3.7.0/Draggable';
import ScrollTrigger from 'https://cdn.skypack.dev/gsap@3.7.0/ScrollTrigger';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://wyetkikeobakrcjfmbzj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZXRraWtlb2Jha3JjamZtYnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MTUzMjgsImV4cCI6MjA2MjA5MTMyOH0.Nq7e6J2e_ls2zTDY0N_xFB86QaRtPUuYHTIindot66M';
const supabase = createClient(supabaseUrl, supabaseKey);

gsap.registerPlugin(Draggable, ScrollTrigger);

let initialLoopTimeline;
let spinLoopTimeline;
let lastBoxIndex = 0;
let currentProgress = 0; // Track the current progress for dragging

async function loadSubmissions() {
    const boxesContainer = document.querySelector('#boxes');
    boxesContainer.innerHTML = '<div class="loading">Loading art submissions...</div>';

    try {
        const { data, error } = await supabase
            .from('submissions')
            .select('id, image_url, username, timestamp')
            .order('timestamp', { ascending: false });

        console.log('Supabase response:', { data, error });

        if (error) {
            console.error('Error fetching submissions:', error);
            boxesContainer.innerHTML = '<div class="error">Failed to load submissions.</div>';
            return;
        }

        if (data.length === 0) {
            console.log('No submissions found');
            boxesContainer.innerHTML = '<div class="error">No art submissions available yet!</div>';
            return;
        }

        boxesContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();

        const preloadPromises = data.map(submission => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = submission.image_url;
                img.onload = resolve;
                img.onerror = () => {
                    img.src = 'https://via.placeholder.com/280x380?text=Image+Not+Found';
                    resolve();
                };
            });
        });

        await Promise.all(preloadPromises);
        console.log('All images preloaded');

        data.forEach((submission, index) => {
            const box = document.createElement('div');
            box.classList.add('box');
            box.dataset.id = submission.id;
            box.dataset.index = index;
            box.innerHTML = `<img src="${submission.image_url}" alt="Art by ${submission.username}" loading="lazy" />`;
            box.style.backgroundImage = `url(${submission.image_url})`;
            fragment.appendChild(box);
        });

        boxesContainer.appendChild(fragment);

        initializeSeamlessLoop();
        initializeInteractions();
    } catch (err) {
        console.error('Unexpected error:', err);
        boxesContainer.innerHTML = '<div class="error">An unexpected error occurred.</div>';
    }
}

function initializeSeamlessLoop() {
    const boxes = document.querySelectorAll('.box');
    if (boxes.length === 0) return;

    gsap.set(boxes, { display: 'block', yPercent: -50 });

    const STAGGER = 0.2;
    const DURATION = 1;
    const OFFSET = 0;
    const BOXES = gsap.utils.toArray(boxes);

    // Initial Loop: Visual animations without spinning
    const INITIAL_LOOP = gsap.timeline({
        repeat: -1,
        ease: 'none',
    });

    const SHIFTS = [...BOXES, ...BOXES, ...BOXES];

    SHIFTS.forEach((BOX, index) => {
        const BOX_TL = gsap.timeline()
            .set(BOX, {
                xPercent: 300,
                rotateY: -60,
                opacity: 0,
                scale: 0.6,
            })
            .to(BOX, {
                opacity: 1,
                scale: 1,
                duration: 0.2,
            }, 0)
            .to(BOX, {
                opacity: 0,
                scale: 0.6,
                duration: 0.2,
            }, 0.8)
            .fromTo(BOX, {
                rotateY: -60,
            }, {
                rotateY: 60,
                immediateRender: false,
                duration: 1,
                ease: 'power4.inOut',
            }, 0)
            .to(BOX, {
                z: 150,
                scale: 1.5,
                duration: 0.2,
                repeat: 1,
                yoyo: true,
            }, 0.4)
            .fromTo(BOX, {
                zIndex: 1,
            }, {
                zIndex: BOXES.length * 2,
                repeat: 1,
                yoyo: true,
                ease: 'none',
                duration: 0.5,
                immediateRender: false,
            }, 0);

        INITIAL_LOOP.add(BOX_TL, index * STAGGER);
    });

    initialLoopTimeline = INITIAL_LOOP;
    initialLoopTimeline.play(); // Play the visual animations

    // Spin Loop: Handles the spinning motion
    const SPIN_LOOP = gsap.timeline({
        paused: true,
        repeat: -1,
        ease: 'none',
    });

    SHIFTS.forEach((BOX, index) => {
        const BOX_TL = gsap.timeline()
            .fromTo(BOX, {
                xPercent: 300,
            }, {
                xPercent: -400,
                duration: 1,
                immediateRender: false,
                ease: 'power1.inOut',
            }, 0);

        SPIN_LOOP.add(BOX_TL, index * STAGGER);
    });

    const CYCLE_DURATION = STAGGER * BOXES.length;
    const START_TIME = CYCLE_DURATION + DURATION * 0.5 + OFFSET;

    spinLoopTimeline = gsap.fromTo(
        SPIN_LOOP,
        { totalTime: START_TIME },
        {
            totalTime: `+=${CYCLE_DURATION}`,
            duration: 1,
            ease: 'none',
            repeat: -1,
            paused: true,
        }
    );

    spinLoopTimeline.vars.onUpdate = () => {
        const progress = spinLoopTimeline.progress();
        lastBoxIndex = Math.floor(progress * BOXES.length) % BOXES.length;
        currentProgress = progress; // Update current progress
    };
}

function initializeInteractions() {
    const boxes = document.querySelectorAll('.box');
    const boxesContainer = document.querySelector('#boxes');

    if (boxes.length === 0) return;

    const BOXES = gsap.utils.toArray(boxes);
    const totalBoxes = BOXES.length;

    Draggable.create(boxesContainer, {
        type: 'x',
        edgeResistance: 0.65,
        inertia: true,
        onDrag: function() {
            const progress = -this.x / (totalBoxes * (boxes[0].offsetWidth + 20));
            spinLoopTimeline.progress(progress % 1);
            currentProgress = spinLoopTimeline.progress();
            lastBoxIndex = Math.floor(currentProgress * totalBoxes) % totalBoxes;
        },
        onDragEnd: function() {
            spinLoopTimeline.pause();
        }
    });

    boxes.forEach((box, index) => {
        box.addEventListener('click', (e) => {
            e.stopPropagation();
            const isEnlarged = box.classList.contains('enlarged');
            boxes.forEach(b => {
                b.classList.remove('enlarged', 'winner');
                gsap.to(b, { scale: 1, duration: 0.3, ease: 'power2.out' });
            });
            if (!isEnlarged) {
                box.classList.add('enlarged');
                spinLoopTimeline.pause();

                const originalIndex = parseInt(box.dataset.index);
                const targetProgress = (originalIndex + 0.5) / totalBoxes;
                gsap.to(spinLoopTimeline, {
                    progress: targetProgress,
                    duration: 0.5,
                    ease: 'power2.out',
                    onComplete: () => {
                        const scale = window.innerWidth <= 768 ? (window.innerHeight <= 600 ? 1.2 : 1.5) : 2;
                        gsap.to(box, {
                            scale: scale,
                            duration: 0.5,
                            ease: 'elastic.out(1, 0.5)'
                        });
                        lastBoxIndex = originalIndex;
                        currentProgress = targetProgress;
                    }
                });
            } else {
                gsap.to(box, { scale: 1, duration: 0.3, ease: 'power2.out' });
                spinLoopTimeline.pause();
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.box') && !e.target.classList.contains('spin-button')) {
            boxes.forEach(b => {
                b.classList.remove('enlarged', 'winner');
                gsap.to(b, { scale: 1, duration: 0.3, ease: 'power2.out' });
            });
            spinLoopTimeline.pause();
        }
    });

    document.querySelector('.spin-button').addEventListener('click', () => {
        if (boxes.length === 0) {
            alert('No art submissions available to spin!');
            return;
        }

        boxes.forEach(box => {
            box.classList.remove('winner', 'enlarged');
            gsap.to(box, { scale: 1, duration: 0.3, ease: 'power2.out' });
        });

        spinLoopTimeline.pause();

        const spins = 3;
        const spinDuration = 8;

        const winnerIndex = Math.floor(Math.random() * totalBoxes);
        const winnerBox = BOXES[winnerIndex];

        const STAGGER = 0.2;
        const winnerCycleStart = winnerIndex * STAGGER;
        // Adjust the progress to land where rotateY is 0 (middle of the animation)
        const winnerMiddleProgress = (winnerCycleStart + (STAGGER * 0.5)) / (STAGGER * totalBoxes);
        const fullCycles = Math.floor(currentProgress) + spins;
        const targetProgress = fullCycles + winnerMiddleProgress;

        gsap.to(spinLoopTimeline, {
            progress: targetProgress,
            duration: spinDuration,
            ease: 'power2.inOut',
            onUpdate: () => {
                spinLoopTimeline.progress(spinLoopTimeline.progress() % 1);
                currentProgress = spinLoopTimeline.progress();
            },
            onComplete: () => {
                const finalProgress = winnerMiddleProgress % 1;
                gsap.to(spinLoopTimeline, {
                    progress: finalProgress,
                    duration: 0.5,
                    ease: 'elastic.out(1, 0.5)',
                    onComplete: () => {
                        // Ensure the winner box is at rotateY: 0
                        gsap.to(winnerBox, {
                            rotateY: 0,
                            duration: 0.3,
                            ease: 'power2.out'
                        });
                        winnerBox.classList.add('winner', 'enlarged');
                        const scale = window.innerWidth <= 768 ? (window.innerHeight <= 600 ? 1.2 : 1.5) : 2;
                        gsap.to(winnerBox, {
                            scale: scale,
                            duration: 0.5,
                            ease: 'elastic.out(1, 0.5)'
                        });
                        lastBoxIndex = winnerIndex;
                        currentProgress = finalProgress;
                    }
                });
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadSubmissions();
});