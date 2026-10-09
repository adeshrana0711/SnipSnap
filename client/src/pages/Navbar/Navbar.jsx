import react from 'react';

export default function Navbar() {
    return (
        <div>
            <nav className="login-navbar">
                <div className="login-navbar-inner">
                    <Link to="/" className="login-logo">BARQ</Link>

                    <div className="login-nav-links">
                        <Link to="/" className="login-nav-link">
                            <i className="bx bx-home-alt"></i>
                            Home
                        </Link>

                        <Link to="/contact" className="login-nav-link">
                            <i className="bx bx-phone"></i>
                            Contact
                        </Link>
                    </div>

                </div>
            </nav>
        </div>
    )
}