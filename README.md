# Kulture

A fun and interactive educational web app designed to help children discover and celebrate their African roots through picture-naming quizzes.

## About the App

Kulture is a lightweight, client-side web application that delivers short, engaging quiz rounds to help young learners connect with African culture. In a world where social media feeds children tons of western culture, Kulture helps parents and educators enable their kids to learn and appreciate their African roots through interactive play.

## Features

- **Three-Level Quiz System**: Progressively challenging rounds from Level 1 (5 questions) through Level 3 (5 questions each).
- **AI-Powered Image Recognition**: Uses API Ninjas object detection to automatically label quiz images when labels are missing.
- **Interactive Picture Naming**: Children see high-contrast, culturally relevant images and select answers from four options.
- **Instant Feedback**: Supportive messages celebrate correct answers and encourage retries on mistakes.
- **Confetti Animations**: Visual rewards appear when questions are answered correctly.
- **Level Progression**: Users advance through levels automatically after completing each one.
- **Accessible Design**: Full keyboard navigation support, ARIA labels, and touch-friendly button sizes for small hands.
- **Fully Responsive**: Works seamlessly on desktop, tablet, and mobile devices including iPhone SE.
- **Progressive Web App Ready**: Service worker support for offline functionality.

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6 modules)
- **Styling**: CSS3 with responsive design
- **APIs**: API Ninjas object detection for image labeling
- **Browser APIs**: Fetch, DOM manipulation, Local Storage
- **No frameworks**: Built with pure HTML, CSS, and JavaScript for minimal dependencies

## Project Structure

```
cultural_learning_web_app/
├── index.html                 # Home page
├── quiz.html                  # Quiz interface
├── about.html                 # About page
├── style.css                  # Global styles and variables
├── quiz.css                   # Quiz-specific styles
├── quiz.js                    # Main quiz logic
├── api/
│   ├── api.js                 # API Ninjas detection wrapper
│   ├── config.js              # API key configuration
│   └── questions.json         # Quiz dataset (q1-q15)
├── images/                    # Quiz image assets
├── js/
│   ├── register-sw.js         # Service worker registration
│   └── quiz.js                # Quiz application logic
└── components/                # Reusable HTML components
    ├── navigation.html        # Header navigation
    └── footer.html            # Footer section
```

## Quiz Dataset

The app uses a client-side JSON dataset (`api/questions.json`) containing 15 questions divided into three levels:

- **Level 1**: Questions 1-5 (Beginner)
- **Level 2**: Questions 6-10 (Intermediate)
- **Level 3**: Questions 11-15 (Advanced)

Each question includes:
- `id`: Unique identifier (q1-q15)
- `image`: Path to the quiz image
- `label`: Correct answer label (automatically detected if missing)
- `distractors`: Alternative answer options

## Getting Started

### Installation

1. Clone the repository:
```bash
git clone https://github.com/G-Njunge/cultural_learning_web_app.git
cd cultural_learning_web_app
```

2. Set up your API key:
   - Create `api/config.js` with your API Ninjas key:
   ```javascript
   export const API_KEY = 'your-api-ninjas-key-here';
   ```
   - Get a free API key at https://api-ninjas.com

3. Serve the app locally:
```bash
# Using Python 3
python -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js
npx http-server
```

4. Open your browser and navigate to:
```
http://localhost:8000
```

## Usage

### For Users

1. **Home Page**: Click "Start the Quest" to begin the quiz.
2. **Quiz Rounds**: Answer 5 questions per level by selecting the correct picture label.
3. **Level Progression**: Automatically advance to the next level after completing each one.
4. **End Rewards**: See completion messages and choose to play again or return home.
5. **Navigation**: Use the nav bar to jump between Home, Quiz, and About pages at any time.

### For Developers

To customize the quiz:

1. **Add New Questions**: Edit `api/questions.json` and add entries for q16, q17, etc.
2. **Update Images**: Place image files in the `images/` folder and reference them in the dataset.
3. **Modify Styling**: Edit `style.css` (global) or `quiz.css` (quiz-specific).
4. **Adjust Quiz Flow**: Edit `quiz.js` functions like `loadQuestions()`, `renderQuestion()`, and `showLevelCompletionOptions()`.

## Features in Detail

### Responsive Design

The app features progressive breakpoints for optimal viewing:

- **Desktop (1024px+)**: Two-column layout with image on left, content on right
- **Tablet (768px-1023px)**: Single column with adjusted spacing
- **Mobile (640px-767px)**: Compact layout with full-width buttons
- **Small Phone (480px and below)**: Extra-tight spacing for devices like iPhone SE

### Accessibility

- Full keyboard navigation for all interactive elements
- ARIA labels for screen readers
- Focus indicators for keyboard users
- Touch-friendly button sizes (minimum 44-56px height)
- High contrast text and buttons for readability

### Image Detection

When a quiz question's label is missing, the app automatically:

1. Fetches the image from the server
2. Sends it to API Ninjas for object detection
3. Extracts the detected label
4. Uses it as the correct answer while showing distractors

This happens silently in the background without blocking the quiz UI.

## Configuration

### Environment Variables

Create `api/config.js`:

```javascript
export const API_KEY = 'your-api-ninjas-key-here';
```

### Customizing Branding

Update these files to rebrand:

- `index.html`: Home page title and hero text
- `about.html`: About page copy
- `style.css`: Color variables (--color-primary, --color-secondary, etc.)
- `quiz.css`: Quiz-specific styles
- Components: `components/navigation.html` and `components/footer.html`

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- **Lightweight**: No external frameworks, minimal CSS
- **Fast Load**: Static site with client-side rendering
- **Offline Ready**: Service worker for offline quiz access
- **Responsive**: Adaptive images and CSS media queries

## Accessibility Compliance

- WCAG 2.1 Level AA targeted
- Full keyboard navigation
- Semantic HTML structure
- ARIA attributes for dynamic content
- Color contrast ratios meet accessibility standards

## Known Limitations

- API Ninjas detection is client-side and requires internet connection
- API key is exposed in client-side code (use a backend proxy for production)
- Maximum 15 questions per dataset (easily expandable)

## Future Enhancements

- Backend API for secure key management
- User accounts and progress tracking
- Multiplayer mode
- Custom question sets
- Offline-first architecture with service workers
- Analytics and performance tracking
- Admin panel for content management

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (git checkout -b feature/amazing-feature)
3. Commit your changes (git commit -m 'Add amazing feature')
4. Push to the branch (git push origin feature/amazing-feature)
5. Open a Pull Request

## License

This project is open source and available under the MIT License. See LICENSE file for details.

## Author

Created by G-Njunge

GitHub: https://github.com/G-Njunge

## Support

For issues, feature requests, or feedback, please open an issue on the GitHub repository.

## Changelog

### Version 1.0.0 (Current)

Initial release featuring:
- Three-level quiz system
- API Ninjas image detection
- Responsive design for all devices
- Accessibility features
- Service worker support
- Confetti animations on correct answers
- End-of-level progression
- About page with feature highlights

## Acknowledgments

- API Ninjas for object detection capability
- Pexels for stock images
- The open source community for inspiration and tools
